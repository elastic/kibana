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
import {
  DEFAULT_METRICS_VIEW,
  DEFAULT_METRICS_VIEW_ATTRIBUTES,
} from '../../../../common/constants';
import { resolveAdHocDataView } from '../../../utils/data_view';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useLogViewReference } from '../../../hooks/use_log_view_reference';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';

const useDataViews = ({ metricsIndexPattern }: { metricsIndexPattern: string }) => {
  const { asset } = useAssetDetailsRenderPropsContext();
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const { value: metricsView, loading: metricsDataViewLoading } = useAsync(
    () =>
      resolveAdHocDataView({
        dataViewsService: dataViews,
        dataViewId: DEFAULT_METRICS_VIEW.metricsViewId,
        attributes: {
          indexPattern: metricsIndexPattern,
          name: DEFAULT_METRICS_VIEW_ATTRIBUTES.name,
          timeFieldName: DEFAULT_METRICS_VIEW_ATTRIBUTES.timeFieldName,
        },
      }),
    [dataViews, metricsIndexPattern]
  );

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
    metrics: { dataView: metricsView?.dataViewReference, loading: metricsDataViewLoading },
    logs: {
      dataView: logsDataView,
      reference: logViewReference,
      loading: logsReferenceLoading || logsDataViewLoading,
    },
  };
};

export const [DataViewsProvider, useDataViewsContext] = createContainer(useDataViews);
