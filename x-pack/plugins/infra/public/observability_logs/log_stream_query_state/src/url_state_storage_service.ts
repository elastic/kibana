/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { actions, InvokeCreator } from 'xstate';
import { createPlainError, formatErrors } from '../../../../common/runtime_types';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithParsedQuery,
  LogStreamQueryContextWithQuery,
  LogStreamQueryEvent,
  ParsedQuery,
} from './types';

interface LogStreamQueryUrlStateDependencies {
  urlStateStorage: IKbnUrlStateStorage;
  filterStateKey?: string;
}

const defaultFilterStateKey = 'logFilter'; // TODO: change to a different key for BWC
const defaultFilterStateValue: FilterStateInUrl = {
  query: {
    language: 'kuery',
    query: '',
  },
};
export const safeDefaultParsedQuery: ParsedQuery = {
  bool: {
    must: [],
    must_not: [],
    should: [],
    filter: [{ match_none: {} }],
  },
};

export const subscribeToUrlStateStorageChanges =
  ({
    urlStateStorage,
    filterStateKey = defaultFilterStateKey,
  }: LogStreamQueryUrlStateDependencies): InvokeCreator<
    LogStreamQueryContext,
    LogStreamQueryEvent
  > =>
  (context) =>
  (send) => {
    const urlFilterState$ = urlStateStorage.change$(filterStateKey);

    // TODO: send() the proper change events
  };

export const updateQueryInUrl =
  ({
    urlStateStorage,
    filterStateKey = defaultFilterStateKey,
  }: LogStreamQueryUrlStateDependencies) =>
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if (!('query' in context)) {
      throw new Error();
    }

    urlStateStorage.set(
      filterStateKey,
      filterStateInUrlRT.encode({
        query: context.query,
      })
    );
  };

export const initializeFromUrl = ({
  filterStateKey = defaultFilterStateKey,
  toastsService,
  urlStateStorage,
}: LogStreamQueryUrlStateDependencies & {
  toastsService: IToasts;
}) =>
  actions.pure<LogStreamQueryContext, LogStreamQueryEvent>(() => {
    const queryValueFromUrl = urlStateStorage.get(filterStateKey) ?? defaultFilterStateValue;
    return pipe(
      legacyFilterStateInUrlRT.decode(queryValueFromUrl),
      Either.map((legacyQuery) => ({ query: legacyQuery })),
      Either.alt(() => filterStateInUrlRT.decode(queryValueFromUrl)),
      Either.fold(
        (errors) => [
          {
            type: '__notifyOnError',
            exec: () => {
              withNotifyOnErrors(toastsService).onGetError(createPlainError(formatErrors(errors)));
            },
          },
          actions.assign<LogStreamQueryContext, LogStreamQueryEvent>({
            query: defaultFilterStateValue.query,
            parsedQuery: safeDefaultParsedQuery,
          } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithParsedQuery),
        ],
        ({ query }) => [
          actions.assign<LogStreamQueryContext, LogStreamQueryEvent>({
            query,
            parsedQuery: safeDefaultParsedQuery,
          } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithParsedQuery),
        ]
      )
    );
  });

const filterStateInUrlRT = rt.strict({
  query: rt.union([
    rt.strict({
      language: rt.string,
      query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
    }),
    rt.strict({
      sql: rt.string,
    }),
    rt.strict({
      esql: rt.string,
    }),
  ]),
  // "filters" could go here
});

type FilterStateInUrl = rt.TypeOf<typeof filterStateInUrlRT>;

const legacyFilterStateInUrlRT = rt.union([
  rt.strict({
    language: rt.string,
    query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
  }),
  rt.strict({
    sql: rt.string,
  }),
  rt.strict({
    esql: rt.string,
  }),
]);
