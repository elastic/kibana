/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../utils/kibana_react';

interface UseCreateDataViewProps {
  indexPatternString?: string;
  dataViewId?: string;
}

export function useCreateDataView({ indexPatternString, dataViewId }: UseCreateDataViewProps) {
  const { dataViews } = useKibana().services;

  const { data: dataView, loading } = useFetcher(async () => {
    if (dataViewId) {
      try {
        return await dataViews.get(dataViewId);
      } catch (e) {
        return dataViews.create({
          id: `${indexPatternString}-id`,
          title: indexPatternString,
          allowNoIndex: true,
        });
      }
    } else if (indexPatternString) {
      return dataViews.create({
        id: `${indexPatternString}-id`,
        title: indexPatternString,
        allowNoIndex: true,
      });
    }
  }, [dataViewId, dataViews, indexPatternString]);

  return { dataView, loading: Boolean(loading) };
}
