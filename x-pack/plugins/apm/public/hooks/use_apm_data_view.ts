/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import { ApmPluginStartDeps } from '../plugin';
import { callApmApi } from '../services/rest/create_call_apm_api';

async function getApmDataViewTitle() {
  const res = await callApmApi('GET /internal/apm/data_view/title', {
    signal: null,
  });
  return res.apmDataViewTitle;
}

export function useApmDataView() {
  const { services, notifications } = useKibana<ApmPluginStartDeps>();
  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    async function fetchDataView() {
      const title = await getApmDataViewTitle();
      try {
        const displayError = false;
        return await services.dataViews.create(
          { title },
          undefined,
          displayError
        );
      } catch (e) {
        const noDataScreen = e.message.includes('No matching indices found');
        if (noDataScreen) {
          return;
        }

        notifications.toasts.danger({
          title: i18n.translate('xpack.apm.data_view.creation_failed', {
            defaultMessage: 'An error occurred while creating the data view',
          }),
          body: e.message,
        });

        throw e;
      }
    }

    fetchDataView().then(setDataView);
  }, [notifications.toasts, services.dataViews]);

  return { dataView };
}
