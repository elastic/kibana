/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useDataMetricsAdHocDataView } from '../../../../hooks/use_metrics_adhoc_data_view';

export const useDataView = ({ metricAlias }: { metricAlias: string }) => {
  const {
    dataView,
    loading,
    loadDataView: retry,
    error,
  } = useDataMetricsAdHocDataView({ metricAlias });

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
