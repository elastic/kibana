/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import createContainer from 'constate';
import { i18n } from '@kbn/i18n';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { useLogViewReference } from '../../../hooks/use_log_view_reference';
import { useDataView } from '../../../hooks/use_data_view';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';

const useDataViews = ({ metricAlias }: { metricAlias: string }) => {
  const { asset } = useAssetDetailsRenderPropsContext();
  const { dataView: metricsDataView, loading: metricsDataViewLoading } = useDataView({
    index: metricAlias,
  });
  const {
    logViewReference,
    getLogsDataView,
    loading: logsReferenceLoading,
  } = useLogViewReference({
    id: 'asset-details-logs-view',
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.logs.assetLogsWidgetName', {
      defaultMessage: 'Logs from {type} "{name}"',
      values: {
        name: asset.name,
        type: findInventoryModel(asset.type).singularDisplayName,
      },
    }),
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

export const [DataViewsProvider, useDataViewsContext] = createContainer(useDataViews);
