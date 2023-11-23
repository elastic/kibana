/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableFlamegraph } from '@kbn/observability-shared-plugin/public';
import { BaseFlameGraph } from '@kbn/profiling-utils';
import React, { useEffect } from 'react';
import { InfraProfilingRequestParamsRT } from '../../../../../common/http_api/profiling_api';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';

export function Profiling() {
  const { asset } = useAssetDetailsRenderPropsContext();
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const body = {
    hostname: asset.name,
    timeRange: getDateRangeInTimestamp(),
  };

  const { loading, response, makeRequest } = useHTTPRequest<BaseFlameGraph>(
    '/api/infra/profiling/flamegraph',
    'POST',
    JSON.stringify(InfraProfilingRequestParamsRT.encode(body)),
    undefined,
    undefined,
    undefined,
    true
  );

  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return <EmbeddableFlamegraph data={response ?? undefined} isLoading={loading} height="60vh" />;
}
