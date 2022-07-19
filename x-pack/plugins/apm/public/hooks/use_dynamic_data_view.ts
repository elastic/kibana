/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../plugin';
import { useFetcher } from './use_fetcher';

export function useDynamicDataViewFetcher() {
  const { services } = useKibana<ApmPluginStartDeps>();

  const { data, status } = useFetcher(
    async (callApmApi) => {
      const res = await callApmApi('GET /internal/apm/data_view/title', {
        isCachable: true,
      });

      return services.dataViews.create({ title: res.apmDataViewTitle });
    },
    [services.dataViews]
  );

  return { dataView: data, status };
}
