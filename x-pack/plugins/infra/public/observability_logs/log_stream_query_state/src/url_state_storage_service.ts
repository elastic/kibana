/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { Query } from '@kbn/es-query';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Array from 'fp-ts/lib/Array';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { InvokeCreator } from 'xstate';
import { createPlainError, formatErrors } from '../../../../common/runtime_types';
import { replaceStateKeyInQueryString } from '../../../utils/url_state';
import type { LogStreamQueryContext, LogStreamQueryEvent, ParsedQuery } from './types';

interface LogStreamQueryUrlStateDependencies {
  filterStateKey?: string;
  savedQueryIdKey?: string;
  toastsService: IToasts;
  urlStateStorage: IKbnUrlStateStorage;
}

const defaultFilterStateKey = 'logFilter';
const defaultFilterStateValue: Required<FilterStateInUrl> = {
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

export const updateQueryInUrl =
  ({
    urlStateStorage,
    filterStateKey = defaultFilterStateKey,
  }: LogStreamQueryUrlStateDependencies) =>
  (context: LogStreamQueryContext, _event: LogStreamQueryEvent) => {
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
  (context: LogStreamQueryContext, _event: LogStreamQueryEvent) => {
    if (!('filters' in context)) {
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

export const initializeFromUrl =
  ({
    filterStateKey = defaultFilterStateKey,
    toastsService,
    urlStateStorage,
  }: LogStreamQueryUrlStateDependencies): InvokeCreator<
    LogStreamQueryContext,
    LogStreamQueryEvent
  > =>
  (_context, _event) =>
  (send) => {
    const queryValueFromUrl = urlStateStorage.get(filterStateKey) ?? defaultFilterStateValue;

    const queryE = decodeQueryValueFromUrl(queryValueFromUrl);

    if (Either.isLeft(queryE)) {
      withNotifyOnErrors(toastsService).onGetError(createPlainError(formatErrors(queryE.left)));

      send({
        type: 'INITIALIZED_FROM_URL',
        query: defaultFilterStateValue.query,
        filters: defaultFilterStateValue.filters,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        query: queryE.right.query ?? defaultFilterStateValue.query,
        filters: queryE.right.filters ?? defaultFilterStateValue.filters,
      });
    }
  };

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
  params: rt.any,
  value: rt.any,
});

const filter = rt.intersection([
  rt.type({
    meta: filterMeta,
  }),
  rt.partial({
    query: rt.UnknownRecord,
  }),
]);

const filterStateInUrlRT = rt.partial({
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
  filters: rt.array(filter),
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

const decodeQueryValueFromUrl = (queryValueFromUrl: unknown) =>
  Either.getAltValidation(Array.getMonoid<rt.ValidationError>()).alt<FilterStateInUrl>(
    pipe(
      legacyFilterStateInUrlRT.decode(queryValueFromUrl),
      Either.map((legacyQuery) => ({ query: legacyQuery }))
    ),
    () => filterStateInUrlRT.decode(queryValueFromUrl)
  );

export const replaceLogFilterInQueryString = (query: Query) =>
  replaceStateKeyInQueryString<Query>(defaultFilterStateKey, query);
