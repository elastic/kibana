/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useDataView } from '../../../../hooks/use_data_view';

export const useMetricsDataView = ({ metricAlias }: { metricAlias: string }) => {
  const { dataView, loading, retry, error } = useDataView({
    index: metricAlias,
  });

  return {
    metricAlias,
    dataView,
    loading,
    retry,
    error,
  };
};

export const MetricsDataView = createContainer(useMetricsDataView);
export const [MetricsDataViewProvider, useMetricsDataViewContext] = MetricsDataView;
