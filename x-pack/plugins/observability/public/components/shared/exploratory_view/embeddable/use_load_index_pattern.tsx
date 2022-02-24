/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { AppDataType } from '../types';
import { IndexPatternState } from '../hooks/use_app_index_pattern';
import { ObservabilityDataViews } from '../../../../utils/observability_data_views';
import { DataViewsPublicPluginStart } from '../../../../../../../../src/plugins/data_views/public';

export const useLoadIndexPattern = ({
  dataType,
  dataTypesIndexPatterns,
  dataViewsPlugin,
  retryOnFetchDataViewFailure,
}: {
  dataType: AppDataType;
  dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
  dataViewsPlugin: DataViewsPublicPluginStart;
  retryOnFetchDataViewFailure?: boolean;
}) => {
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternState>({} as IndexPatternState);
  const [loading, setLoading] = useState(false);
  const loadIndexPattern = useCallback(async () => {
    setLoading(true);
    try {
      const obsvIndexP = new ObservabilityDataViews(dataViewsPlugin);
      const indPattern = await obsvIndexP.getDataView(
        dataType,
        dataTypesIndexPatterns?.[dataType],
        retryOnFetchDataViewFailure
      );
      setIndexPatterns((prevState) => ({ ...(prevState ?? {}), [dataType]: indPattern }));

      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }, [dataType, dataTypesIndexPatterns, dataViewsPlugin, retryOnFetchDataViewFailure]);

  useEffect(() => {
    if (dataType) {
      loadIndexPattern();
    }
  }, [dataType, loadIndexPattern]);

  return { indexPatterns, loading };
};
