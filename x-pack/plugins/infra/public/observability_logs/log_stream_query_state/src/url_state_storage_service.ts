/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { map } from 'rxjs/operators';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { actions, InvokeCreator } from 'xstate';
import deepEqual from 'fast-deep-equal';
import { createPlainError, formatErrors } from '../../../../common/runtime_types';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithParsedQuery,
  LogStreamQueryContextWithQuery,
  LogStreamQueryContextWithSavedQueryId,
  LogStreamQueryEvent,
  ParsedQuery,
} from './types';

interface LogStreamQueryUrlStateDependencies {
  urlStateStorage: IKbnUrlStateStorage;
  filterStateKey?: string;
}

const defaultFilterStateKey = 'logFilter'; // TODO: change to a different key for BWC
const defaultSavedQueryIdKey = 'savedQueryId';
const defaultFilterStateValue: FilterStateInUrl = {
  query: {
    language: 'kuery',
    query: '',
  },
  filters: [],
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
    const urlFilterState$ = urlStateStorage.change$(filterStateKey).pipe(
      map(() => urlStateStorage.get(filterStateKey)),
      map((urlLogFilter) => {
        const { query, filters } = urlLogFilter;
        const queryChanged = !deepEqual(query, context.query);
        const filtersChanged = !deepEqual(filters, context.filters);
        // TODO: See if there's a nicer way to terminate infinite loops between services <-> URL
        if (queryChanged || filtersChanged) {
          send({ type: 'STATE_FROM_URL_KEY_CHANGED', query, filters });
        }
      })
    );

    const subscription = urlFilterState$.subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
        filters: context.filters,
      })
    );
  };

export const updateFiltersInUrl =
  ({
    urlStateStorage,
    filterStateKey = defaultFilterStateKey,
  }: LogStreamQueryUrlStateDependencies) =>
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if (!('filters' in context)) {
      throw new Error();
    }

    urlStateStorage.set(
      filterStateKey,
      filterStateInUrlRT.encode({
        query: context.query, // TODO: Possibly revisit. set() sets an entire key, so we'll need to add query / filters to the opposite update function I think.
        filters: context.filters,
      })
    );
  };

export const initializeFromUrl = ({
  filterStateKey = defaultFilterStateKey,
  savedQueryIdKey = defaultSavedQueryIdKey,
  toastsService,
  urlStateStorage,
}: LogStreamQueryUrlStateDependencies & {
  toastsService: IToasts;
}) =>
  actions.pure<LogStreamQueryContext, LogStreamQueryEvent>(() => {
    const queryValueFromUrl = urlStateStorage.get(filterStateKey) ?? defaultFilterStateValue;
    const savedQueryIdFromUrl = urlStateStorage.get(savedQueryIdKey);

    if (savedQueryIdFromUrl) {
      return [
        actions.assign<LogStreamQueryContext, LogStreamQueryEvent>({
          // TODO: This should perform validation / error handling of the URL key
          savedQueryId: savedQueryIdFromUrl,
        } as LogStreamQueryContextWithSavedQueryId),
        actions.send('RESOLVING_SAVED_QUERY_ID'),
      ];
    } else {
      return pipe(
        legacyFilterStateInUrlRT.decode(queryValueFromUrl),
        Either.map((legacyQuery) => ({ query: legacyQuery })),
        Either.alt(() => filterStateInUrlRT.decode(queryValueFromUrl)),
        Either.fold(
          (errors) => [
            {
              type: '__notifyOnError',
              exec: () => {
                withNotifyOnErrors(toastsService).onGetError(
                  createPlainError(formatErrors(errors))
                );
              },
            },
            actions.assign<LogStreamQueryContext, LogStreamQueryEvent>({
              query: defaultFilterStateValue.query,
              filters: defaultFilterStateValue.filters,
              parsedQuery: safeDefaultParsedQuery,
            } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithParsedQuery),
          ],
          ({ query, filters }) => [
            actions.assign<LogStreamQueryContext, LogStreamQueryEvent>({
              query,
              filters,
              parsedQuery: safeDefaultParsedQuery,
            } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithParsedQuery),
            actions.send('URL_INITIALIZED'),
          ]
        )
      );
    }
  });

const filterMeta = rt.partial({
  alias: rt.union([rt.string, rt.null]),
  disabled: rt.boolean,
  negate: rt.boolean,
  controlledBy: rt.string,
  group: rt.string,
  index: rt.string,
  isMultiIndex: rt.boolean,
  type: rt.string,
  key: rt.string,
  params: rt.unknown,
  value: rt.string,
});

const filter = rt.intersection([
  rt.type({
    meta: filterMeta,
  }),
  rt.partial({
    query: rt.UnknownRecord,
  }),
]);

const filterStateInUrlRT = rt.intersection([
  rt.strict({
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
  }),
  rt.partial({
    filters: rt.array(filter),
  }),
]);

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
