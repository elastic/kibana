/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useTrackHttpRequest } from '../lib/apm/use_track_http_request';
import { APP_UI_ID } from '../../../common/constants';

export const API_QUERY_NAMES = {
  GET_RISK_SCORE_DEPRECATED: `${APP_UI_ID} fetchApi getRiskScoreDeprecated`,
};

type QueryName = typeof API_QUERY_NAMES[keyof typeof API_QUERY_NAMES];
export type Query<Params, Response> = (params: Params) => Promise<Response>;
export interface BasicSignals {
  signal: AbortSignal;
}

/**
 * Wrapped query hook that integrates
 * http-request monitoring using APM transactions.
 */
export const useQueryTracker = <Params extends BasicSignals, Response>(
  query: Query<Params, Response>,
  queryName: QueryName
): Query<Params, Response> => {
  const { startTracking } = useTrackHttpRequest();

  return useMemo(
    () => async (params) => {
      const { endTracking } = startTracking({ name: queryName });
      let result;
      try {
        result = await query(params);
        endTracking('success');
      } catch (err) {
        endTracking(params.signal?.aborted ? 'aborted' : 'error');
        throw err;
      }
      return result;
    },
    [query, queryName, startTracking]
  );
};
