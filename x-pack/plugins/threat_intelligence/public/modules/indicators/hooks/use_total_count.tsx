/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { IKibanaSearchResponse, IEsSearchRequest } from '@kbn/search-types';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { useSourcererDataView } from './use_sourcerer_data_view';
import type { RawIndicatorsResponse } from '../services/fetch_indicators';

export const useIndicatorsTotalCount = () => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { selectedPatterns, loading: loadingDataView } = useSourcererDataView();

  useEffect(() => {
    const query = {
      bool: {
        must: [
          {
            term: {
              'event.category': {
                value: 'threat',
              },
            },
          },
          {
            term: {
              'event.type': {
                value: 'indicator',
              },
            },
          },
        ],
      },
    };
    const req = {
      params: {
        index: selectedPatterns,
        body: {
          size: 0,
          query,
        },
      },
    };

    searchService
      .search<IEsSearchRequest, IKibanaSearchResponse<RawIndicatorsResponse>>(req)
      .subscribe({
        next: (res) => {
          if (!isRunningResponse(res)) {
            const returnedCount = res.rawResponse.hits.total || 0;

            setCount(returnedCount);
            setIsLoading(false);
          }
        },
      });
  }, [searchService, selectedPatterns]);

  return { count, isLoading: isLoading || loadingDataView };
};
