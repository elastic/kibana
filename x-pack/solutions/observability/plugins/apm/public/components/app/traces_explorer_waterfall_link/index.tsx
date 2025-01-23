/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { useApmParams } from '../../../hooks/use_apm_params';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useKibana } from '../../../context/kibana_context/use_kibana';
import { getRedirectToTracesExplorerWaterfallPageUrl } from '../trace_link/get_redirect_to_traces_explorer_waterfall_page_url';

export function TracesExplorerWaterfallLink() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { data: dataService } = services;
  const timeRange = dataService.query.timefilter.timefilter.getTime();

  const {
    query: { rangeFrom = timeRange.from, rangeTo = timeRange.to, query },
  } = useApmParams('/link-to/traces/explorer/waterfall');

  return (
    <Redirect
      to={getRedirectToTracesExplorerWaterfallPageUrl({
        rangeFrom,
        rangeTo,
        query,
      })}
    />
  );
}
