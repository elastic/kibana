/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import {
  IEsSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
} from '@kbn/data-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { RawIndicatorsResponse } from './use_indicators';
import { useSourcererDataView } from './use_sourcerer_data_view';

export const useIndicatorsTotalCount = () => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { selectedPatterns } = useSourcererDataView();

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
          if (isCompleteResponse(res)) {
            const returnedCount = res.rawResponse.hits.total || 0;

            setCount(returnedCount);
            setIsLoading(false);
          }
        },
      });
  }, [searchService, selectedPatterns]);

  return { count, isLoading };
};
