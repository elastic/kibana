/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/es-query';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import * as rt from 'io-ts';
import { actions, InvokeCreator } from 'xstate';
import { decodeOrThrow } from '../../../../common/runtime_types';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithParsedQuery,
  LogStreamQueryContextWithQuery,
  LogStreamQueryEvent,
} from './types';

interface LogStreamQueryUrlStateDependencies {
  urlStateStorage: IKbnUrlStateStorage;
  filterStateKey?: string;
}

const defaultFilterStateKey = 'logFilter'; // TODO: change to a different key for BWC
const defaultFilterStateValue: Query = {
  language: 'kuery',
  query: '',
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

    // TODO: update url state
  };

export const initializeFromUrl = ({
  urlStateStorage,
  filterStateKey = defaultFilterStateKey,
}: LogStreamQueryUrlStateDependencies) =>
  actions.assign((context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    const queryValueFromUrl = urlStateStorage.get(filterStateKey) ?? defaultFilterStateValue;
    const query = decodeOrThrow(filterStateInUrlRT)(queryValueFromUrl);

    return {
      query,
      parsedQuery: { bool: { filter: [{ match_none: {} }] } }, // safe default
    } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithParsedQuery;
  });

const filterStateInUrlRT = rt.union([
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
