/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { EmbeddableFlamegraph } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useProfilingFlamegraphData } from '../../hooks/use_profiling_flamegraph_data';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../types';
import { ErrorPrompt } from './error_prompt';
import { ProfilingLinks } from './profiling_links';
import { EmptyDataPrompt } from './empty_data_prompt';

interface Props {
  kuery: string;
}

export function Flamegraph({ kuery }: Props) {
  const { services } = useKibanaContextForPlugin();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { activeTabId } = useTabSwitcherContext();
  const { dateRange, getDateRangeInTimestamp } = useDatePickerContext();
  const { from, to } = getDateRangeInTimestamp();

  const profilingLinkLocator = services.observabilityShared.locators.profiling.flamegraphLocator;
  const profilingLinkLabel = i18n.translate('xpack.infra.flamegraph.profilingAppFlamegraphLink', {
    defaultMessage: 'Go to Universal Profiling Flamegraph',
  });

  const params = useMemo(() => ({ kuery, from, to }), [from, kuery, to]);
  const { error, loading, response } = useProfilingFlamegraphData({
    isActive: activeTabId === ContentTabIds.PROFILING,
    params,
  });

  if (error !== null) {
    return <ErrorPrompt />;
  }

  if (!loading && response?.TotalSamples === 0) {
    return <EmptyDataPrompt />;
  }

  return (
    <>
      <ProfilingLinks
        hostname={asset.name}
        from={dateRange.from}
        to={dateRange.to}
        profilingLinkLocator={profilingLinkLocator}
        profilingLinkLabel={profilingLinkLabel}
      />
      <EuiSpacer />
      <EmbeddableFlamegraph data={response ?? undefined} isLoading={loading} height="60vh" />
    </>
  );
}
