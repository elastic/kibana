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
import { Indicator } from '../../../../common/types/indicator';
import { useKibana } from '../../../hooks';
import type { RawIndicatorsResponse } from '../../indicators/services/fetch_indicators';

/**
 * Retrieve document from ES by id
 * @param indicatorId id of the indicator saved within the cases attachment
 * @return an object with the indicator and the loading status
 */
export const useIndicatorById = (indicatorId: string) => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();
  const [indicator, setIndicator] = useState<Indicator>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const query = {
      bool: {
        must: [
          {
            term: {
              _id: {
                value: indicatorId,
              },
            },
          },
        ],
      },
    };
    const fields = [
      {
        field: '*',
        include_unmapped: true,
      },
    ];
    const req = {
      params: {
        index: ['filebeat-*'],
        body: {
          query,
          fields,
        },
      },
    };

    searchService
      .search<IEsSearchRequest, IKibanaSearchResponse<RawIndicatorsResponse>>(req)
      .subscribe({
        next: (res) => {
          if (isCompleteResponse(res)) {
            const result = res.rawResponse.hits;

            setIndicator(result.hits[0]);
            setIsLoading(false);
          }
        },
      });
  }, [indicatorId, searchService, setIndicator]);

  return { indicator, isLoading };
};
