/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../../hooks/use_url_state';

const DEFAULT_QUERY = {
  language: 'kuery',
  query: '',
};

type LogsUrlStateUpdater = (newState: LogsUrlState) => void;

const LogsQueryStateRT = rt.type({
  language: rt.string,
  query: rt.any,
});

const encodeUrlState = LogsQueryStateRT.encode;
const decodeUrlState = (defaultValue: LogsUrlState) => (value: unknown) => {
  return pipe(LogsQueryStateRT.decode(value), fold(constant(defaultValue), identity));
};

export type LogsUrlState = rt.TypeOf<typeof LogsQueryStateRT>;

export const useLogsSearchUrlState = (): [LogsUrlState, LogsUrlStateUpdater] => {
  return useUrlState<LogsUrlState>({
    defaultState: DEFAULT_QUERY,
    decodeUrlState: decodeUrlState(DEFAULT_QUERY),
    encodeUrlState,
    urlStateKey: 'logsQuery',
  });
};
