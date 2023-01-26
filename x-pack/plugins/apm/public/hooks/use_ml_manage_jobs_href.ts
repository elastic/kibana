/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';

export function useMlManageJobsHref({ jobId }: { jobId?: string } = {}) {
  const {
    core,
    plugins: { ml },
  } = useApmPluginContext();

  const { urlParams } = useLegacyUrlParams();

  const {
    // hardcoding a custom default of 1 hour since the default kibana timerange of 15 minutes is shorter than the ML interval
    rangeFrom = 'now-1h',
    rangeTo = 'now',
  } = urlParams;

  const mlADLink = useMlHref(ml, core.http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      groupIds: ['apm'],
      jobId,
      globalState: {
        time: { from: rangeFrom, to: rangeTo },
        refreshInterval: { pause: true, value: 10000 },
      },
    },
  });

  return mlADLink;
}
