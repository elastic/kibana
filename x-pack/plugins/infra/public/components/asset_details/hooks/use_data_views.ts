/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import createContainer from 'constate';
import { useLogViewReference } from '../../../hooks/use_log_view_reference';
import { useDataMetricsAdHocDataView } from '../../../hooks/use_metrics_adhoc_data_view';

const useDataViews = ({ metricAlias }: { metricAlias: string }) => {
  const { dataView: metricsDataView, loading: metricsDataViewLoading } =
    useDataMetricsAdHocDataView({ metricAlias });
  const {
    logViewReference,
    getLogsDataView,
    loading: logsReferenceLoading,
  } = useLogViewReference({
    id: 'asset-details-logs-view',
  });

  const { value: logsDataView, loading: logsDataViewLoading } = useAsync(
    () => getLogsDataView(logViewReference),
    [logViewReference]
  );

  return {
    metrics: { dataView: metricsDataView, loading: metricsDataViewLoading },
    logs: {
      dataView: logsDataView,
      reference: logViewReference,
      loading: logsReferenceLoading || logsDataViewLoading,
    },
  };
};

export const [DataViewsProvider, useDataViewsProviderContext] = createContainer(useDataViews);
