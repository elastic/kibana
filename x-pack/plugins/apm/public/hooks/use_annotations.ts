/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useParams } from 'react-router-dom';
import { callApmApi } from '../services/rest/createCallApmApi';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';

const INITIAL_STATE = { annotations: [] };

export function useAnnotations() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end } = urlParams;
  const { environment } = uiFilters;

  const { data = INITIAL_STATE } = useFetcher(() => {
    if (start && end && serviceName) {
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/annotation/search',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            environment,
          },
        },
      });
    }
  }, [start, end, environment, serviceName]);

  return data;
}
