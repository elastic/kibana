/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { SavedObject } from '@kbn/core-saved-objects-common';
import { useMemo } from 'react';
import { SyntheticsParamSO } from '../../../../../../common/runtime_types';
import { apiService } from '../../../../../utils/api_service';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';

export const useParamsList = (lastRefresh: number) => {
  const { data, loading } = useFetcher<
    Promise<{ data: Array<SavedObject<SyntheticsParamSO>> }>
  >(() => {
    return apiService.get(SYNTHETICS_API_URLS.PARAMS);
  }, [lastRefresh]);

  return useMemo(() => {
    return {
      items:
        data?.data.map((item) => ({
          id: item.id,
          ...item.attributes,
          namespaces: item.namespaces,
        })) ?? [],
      loading,
    };
  }, [data, loading]);
};
