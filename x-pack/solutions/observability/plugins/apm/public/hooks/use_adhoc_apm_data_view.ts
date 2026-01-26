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
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import type { ApmPluginStartDeps } from '../plugin';
import { callApmApi } from '../services/rest/create_call_apm_api';

export async function getApmDataViewIndexPattern() {
  return callApmApi('GET /internal/apm/data_view/index_pattern', {
    signal: null,
  });
}

export function useAdHocApmDataView() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [apmIndices, setApmIndices] = useState<APMIndices | undefined>();

  useEffect(() => {
    async function fetchDataView() {
      const { apmDataViewIndexPattern, apmIndices: indices } = await getApmDataViewIndexPattern();

      try {
        const displayError = false;

        const adHocDataView = await services.dataViews.create(
          { title: apmDataViewIndexPattern, timeFieldName: '@timestamp' },
          undefined,
          displayError
        );

        return { dataView: adHocDataView, apmIndices: indices };
      } catch (e) {
        const noDataScreen = e.message.includes('No matching indices found');
        if (noDataScreen) {
          return;
        }

        services.notifications.toasts.addDanger({
          title: i18n.translate('xpack.apm.data_view.creation_failed', {
            defaultMessage: 'An error occurred while creating the data view',
          }),
          text: e.message,
        });

        throw e;
      }
    }

    fetchDataView().then((result) => {
      if (!result) {
        return;
      }
      setDataView(result.dataView);
      setApmIndices(result.apmIndices);
    });
  }, [services.notifications.toasts, services.dataViews]);

  return { dataView, apmIndices };
}
