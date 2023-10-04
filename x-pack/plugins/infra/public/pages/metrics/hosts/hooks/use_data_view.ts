/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import createContainer from 'constate';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { DATA_VIEW_PREFIX, TIMESTAMP_FIELD } from '../constants';

export const generateDataViewId = (indexPattern: string) => {
  // generates a unique but the same uuid as long as the index pattern doesn't change
  return `${DATA_VIEW_PREFIX}_${uuidv5(indexPattern, uuidv5.DNS)}`;
};

export const useDataView = ({ metricAlias }: { metricAlias: string }) => {
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const state = useAsyncRetry(() => {
    return dataViews.create({
      id: generateDataViewId(metricAlias),
      title: metricAlias,
      timeFieldName: TIMESTAMP_FIELD,
    });
  }, [metricAlias]);

  const { value: dataView, loading, error, retry } = state;

  return {
    metricAlias,
    dataView,
    loading,
    loadDataView: retry,
    error,
  };
};

export const MetricsDataView = createContainer(useDataView);
export const [MetricsDataViewProvider, useMetricsDataViewContext] = MetricsDataView;
