/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useProfilingFunctionsData } from '../../hooks/use_profiling_functions_data';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../types';
import { ErrorPrompt } from './error_prompt';

export function Functions() {
  const { asset } = useAssetDetailsRenderPropsContext();
  const { activeTabId } = useTabSwitcherContext();
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const { from, to } = getDateRangeInTimestamp();

  const params = useMemo(
    () => ({
      hostname: asset.name,
      from,
      to,
      startIndex: 0,
      endIndex: 10,
    }),
    [asset.name, from, to]
  );

  const { error, loading, response } = useProfilingFunctionsData({
    isActive: activeTabId === ContentTabIds.PROFILING,
    params,
  });

  if (error !== null) {
    return <ErrorPrompt />;
  }

  return (
    <EmbeddableFunctions
      data={response ?? undefined}
      isLoading={loading}
      rangeFrom={from}
      rangeTo={to}
    />
  );
}
