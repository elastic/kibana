/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
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
  const { services } = useKibana<ApmPluginStartDeps>();
  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    async function fetchDataView() {
      const title = await getApmDataViewTitle();
      return services.dataViews.create({ title });
    }

    fetchDataView().then(setDataView);
  }, [services.dataViews]);

  return { dataView };
}
