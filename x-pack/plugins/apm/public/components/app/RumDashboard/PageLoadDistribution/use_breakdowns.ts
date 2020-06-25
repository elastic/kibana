/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { PercentileR } from './index';

interface Props {
  percentileRange?: PercentileR;
  field: string;
  value: string;
}

export const useBreakdowns = ({ percentileRange, field, value }: Props) => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const { min: minP, max: maxP } = percentileRange ?? {};

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && field && value) {
        return callApmApi({
          pathname: '/api/apm/rum-client/page-load-distribution/breakdown',
          params: {
            query: {
              start,
              end,
              breakdown: value,
              uiFilters: JSON.stringify(uiFilters),
              ...(minP && maxP
                ? {
                    minPercentile: String(minP),
                    maxPercentile: String(maxP),
                  }
                : {}),
            },
          },
        });
      }
    },
    [end, start, uiFilters, field, value, minP, maxP]
  );
  return { data, loading: status !== 'success' };
};
