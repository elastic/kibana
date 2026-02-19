/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import type { ApmPluginStartDeps } from '../../../../../plugin';

export function useMetricsDataView() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDataView() {
      setLoading(true);
      try {
        const displayError = false;

        const { metricIndices } = await services.metricsDataAccess.metricsClient.metricsIndices();

        const adHocDataView = await services.dataViews.create(
          { title: metricIndices, timeFieldName: '@timestamp' },
          undefined,
          displayError
        );

        setDataView(adHocDataView);
      } catch (e) {
        const noDataScreen = e.message?.includes('No matching indices found');
        if (!noDataScreen) {
          services.notifications.toasts.addDanger({
            title: i18n.translate('xpack.apm.infraOverview.metricsDataView.creationFailed', {
              defaultMessage: 'An error occurred while creating the metrics data view',
            }),
            text: e.message,
          });
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDataView();
  }, [services.notifications.toasts, services.dataViews, services.metricsDataAccess]);

  return { dataView, loading };
}
