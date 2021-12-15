/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer, useRef } from 'react';
import { chunk, debounce } from 'lodash';

import { IHttpFetchError, ResponseErrorBody } from 'src/core/public';

import { DEBOUNCE_INTERVAL } from '../../../../common/correlations/constants';
import type {
  ChangePoint,
  ChangePointParams,
  ChangePointsResponse,
} from '../../../../common/correlations/change_point/types';

import { callApmApi } from '../../../services/rest/createCallApmApi';

import {
  getInitialResponse,
  getChangePointsSortedByScore,
  getReducer,
  CorrelationsProgress,
} from './utils/analysis_hook_utils';
import { useFetchParams } from './use_fetch_params';

// Overall progress is a float from 0 to 1.
const LOADED_OVERALL_HISTOGRAM = 0.05;
const LOADED_FIELD_CANDIDATES = LOADED_OVERALL_HISTOGRAM + 0.05;
const LOADED_DONE = 1;
const PROGRESS_STEP_P_VALUES = 0.9;

export function useChangePointDetection(
  searchStrategyParams: ChangePointParams
) {
  const fetchParams = useFetchParams();

  // This use of useReducer (the dispatch function won't get reinstantiated
  // on every update) and debounce avoids flooding consuming components with updates.
  // `setResponse.flush()` can be used to enforce an update.
  const [response, setResponseUnDebounced] = useReducer(
    getReducer<ChangePointsResponse & CorrelationsProgress>(),
    getInitialResponse()
  );
  const setResponse = useMemo(
    () => debounce(setResponseUnDebounced, DEBOUNCE_INTERVAL),
    []
  );

  const abortCtrl = useRef(new AbortController());

  const startFetch = useCallback(async () => {
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();

    setResponse({
      ...getInitialResponse(),
      isRunning: true,
      // explicitly set these to undefined to override a possible previous state.
      error: undefined,
      changePoints: undefined,
      fieldStats: undefined,
    });
    setResponse.flush();

    try {
      // `responseUpdate` will be enriched with additional data with subsequent
      // calls to the overall histogram, field candidates, field value pairs, correlation results
      // and histogram data for statistically significant results.
      const responseUpdate: ChangePointsResponse = {
        ccsWarning: false,
      };

      setResponse({
        ...responseUpdate,
        loaded: LOADED_OVERALL_HISTOGRAM,
      });
      setResponse.flush();

      const { fieldCandidates } = await callApmApi({
        endpoint: 'GET /internal/apm/correlations/field_candidates',
        signal: abortCtrl.current.signal,
        params: {
          query: fetchParams,
        },
      });
      // console.log('fieldCandidates', fieldCandidates);

      // if (abortCtrl.current.signal.aborted) {
      //   return;
      // }

      setResponse({
        loaded: LOADED_FIELD_CANDIDATES,
      });
      setResponse.flush();

      const changePoints: ChangePoint[] = [];
      const fieldsToSample = new Set<string>();
      const chunkSize = 10;
      let chunkLoadCounter = 0;

      const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);
      // console.log('fieldCandidatesChunks', fieldCandidatesChunks);

      for (const fieldCandidatesChunk of fieldCandidatesChunks) {
        const { changePoints: pValues } = await callApmApi({
          endpoint: 'POST /internal/apm/correlations/change_point_p_values',
          signal: abortCtrl.current.signal,
          params: {
            body: {
              ...fetchParams,
              fieldCandidates: fieldCandidatesChunk,
              ...searchStrategyParams,
            },
          },
        });
        // console.log('pValues', pValues);

        if (pValues.length > 0) {
          pValues.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          changePoints.push(...pValues);
          responseUpdate.changePoints = getChangePointsSortedByScore([
            ...changePoints,
          ]);
        }

        chunkLoadCounter++;
        setResponse({
          ...responseUpdate,
          loaded:
            LOADED_FIELD_CANDIDATES +
            (chunkLoadCounter / fieldCandidatesChunks.length) *
              PROGRESS_STEP_P_VALUES,
        });

        if (abortCtrl.current.signal.aborted) {
          return;
        }
      }

      setResponse.flush();

      const { stats } = await callApmApi({
        endpoint: 'POST /internal/apm/correlations/field_stats',
        signal: abortCtrl.current.signal,
        params: {
          body: {
            ...fetchParams,
            fieldsToSample: [...fieldsToSample],
          },
        },
      });

      responseUpdate.fieldStats = stats;
      setResponse({
        ...responseUpdate,
        loaded: LOADED_DONE,
        isRunning: false,
      });
      setResponse.flush();
    } catch (e) {
      if (!abortCtrl.current.signal.aborted) {
        const err = e as Error | IHttpFetchError<ResponseErrorBody>;
        setResponse({
          error:
            'response' in err
              ? err.body?.message ?? err.response?.statusText
              : err.message,
          isRunning: false,
        });
        setResponse.flush();
      }
    }
  }, [fetchParams, setResponse, searchStrategyParams]);

  const cancelFetch = useCallback(() => {
    abortCtrl.current.abort();
    setResponse({
      isRunning: false,
    });
    setResponse.flush();
  }, [setResponse]);

  const { error, loaded, isRunning, ...returnedResponse } = response;
  const progress = useMemo(
    () => ({
      error,
      loaded: Math.round(loaded * 100) / 100,
      isRunning,
    }),
    [error, loaded, isRunning]
  );

  return {
    progress,
    response: returnedResponse,
    startFetch,
    cancelFetch,
  };
}
