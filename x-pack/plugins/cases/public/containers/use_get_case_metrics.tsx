/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { SingleCaseMetrics, SingleCaseMetricsFeature } from './types';
import { useToasts } from '../common/lib/kibana';
import { getSingleCaseMetrics } from './api';
import { ServerError } from '../types';
import { ERROR_TITLE } from './translations';
import { CASE_VIEW_CACHE_KEY, CASE_VIEW_METRICS_CACHE_KEY } from './constants';

export const useGetCaseMetrics = (caseId: string, features: SingleCaseMetricsFeature[]) => {
  const toasts = useToasts();
  const abortCtrlRef = new AbortController();
  return useQuery(
    [CASE_VIEW_CACHE_KEY, CASE_VIEW_METRICS_CACHE_KEY, caseId, features],
    async () => {
      const response: SingleCaseMetrics = await getSingleCaseMetrics(
        caseId,
        features,
        abortCtrlRef.signal
      );
      return {
        metrics: response,
      };
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: ERROR_TITLE }
          );
        }
      },
    }
  );
};
