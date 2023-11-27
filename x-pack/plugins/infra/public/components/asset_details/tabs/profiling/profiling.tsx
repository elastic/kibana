/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EmbeddableFlamegraph } from '@kbn/observability-shared-plugin/public';
import { BaseFlameGraph } from '@kbn/profiling-utils';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useProfilingFlamegraphData } from '../../hooks/use_profilling_flamegraph_data';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../types';

export function Profiling() {
  const { request$ } = useRequestObservable<BaseFlameGraph>();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { activeTabId } = useTabSwitcherContext();
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const { loading, response } = useProfilingFlamegraphData({
    active: activeTabId === ContentTabIds.PROFILING,
    request$,
    hostname: asset.name,
    timeRange: getDateRangeInTimestamp(),
  });

  return <EmbeddableFlamegraph data={response ?? undefined} isLoading={loading} height="60vh" />;
}
