/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../../hooks/use_fetcher';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { PercentileRange } from '.';

interface Props {
  percentileRange?: PercentileRange;
  field: string;
  value: string;
}

export const useBreakdowns = ({ percentileRange, field, value }: Props) => {
  const { urlParams, uxUiFilters } = useLegacyUrlParams();
  const { start, end, searchTerm } = urlParams;
  const { min: minP, max: maxP } = percentileRange ?? {};

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && field && value) {
        return callApmApi(
          'GET /internal/apm/ux/page-load-distribution/breakdown',
          {
            params: {
              query: {
                start,
                end,
                breakdown: value,
                uiFilters: JSON.stringify(uxUiFilters),
                urlQuery: searchTerm,
                ...(minP && maxP
                  ? {
                      minPercentile: String(minP),
                      maxPercentile: String(maxP),
                    }
                  : {}),
              },
            },
          }
        );
      }
    },
    [end, start, uxUiFilters, field, value, minP, maxP, searchTerm]
  );

  return { breakdowns: data?.pageLoadDistBreakdown ?? [], status };
};
