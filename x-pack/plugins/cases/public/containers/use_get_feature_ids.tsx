/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { isValidFeatureId } from '@kbn/rule-data-utils';
import { useEffect, useMemo, useState } from 'react';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import * as i18n from './translations';
import type { FeatureIdsResponse } from './api';
import { getFeatureIds } from './api';
import { casesQueriesKeys } from './constants';

export const useGetFeatureIds = (
  alertIds: string[],
  alertIdsQuery: {
    ids: {
      values: string[];
    };
  },
  enabled: boolean
) => {
  const { showErrorToast } = useCasesToast();
  const [featureIds, setFeatureIds] = useState<string[]>([]);
  const { data, isSuccess, isInitialLoading, isLoading } = useQuery<
    FeatureIdsResponse,
    ServerError
  >(
    casesQueriesKeys.alertFeatureIds(alertIds),
    ({ signal }) => {
      return getFeatureIds({ query: alertIdsQuery, signal });
    },
    {
      enabled,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );

  useEffect(() => {
    if (isSuccess && data) {
      const localFeatureIds = new Set<string>();
      data?.aggregations?.consumer?.buckets?.forEach(
        ({ key, doc_count: docCount }: { key: string; doc_count: number }) => {
          if (docCount > 0 && isValidFeatureId(key)) {
            localFeatureIds.add(key);
          }
        }
      );
      data?.aggregations?.producer?.buckets?.forEach(
        ({ key, doc_count: docCount }: { key: string; doc_count: number }) => {
          if (docCount > 0 && isValidFeatureId(key)) {
            localFeatureIds.add(key);
          }
        }
      );
      setFeatureIds([...localFeatureIds]);
    }
  }, [data, isSuccess]);
  return useMemo(
    () => ({ data: featureIds, isLoading: (isInitialLoading || isLoading) && enabled }),
    [enabled, featureIds, isInitialLoading, isLoading]
  );
};

export type UseGetFeatureIds = typeof useGetFeatureIds;
