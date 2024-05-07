/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useProfilingFunctionsData } from '../../hooks/use_profiling_functions_data';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../types';
import { ErrorPrompt } from './error_prompt';
import { ProfilingLinks } from './profiling_links';
import { EmptyDataPrompt } from './empty_data_prompt';

interface Props {
  kuery: string;
}

export function Functions({ kuery }: Props) {
  const { services } = useKibanaContextForPlugin();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { activeTabId } = useTabSwitcherContext();
  const { dateRange, getDateRangeInTimestamp } = useDatePickerContext();
  const { from, to } = getDateRangeInTimestamp();

  const profilingLinkLocator = services.observabilityShared.locators.profiling.topNFunctionsLocator;
  const profilingLinkLabel = i18n.translate('xpack.infra.flamegraph.profilingAppTopFunctionsLink', {
    defaultMessage: 'Go to Universal Profiling Functions',
  });

  const params = useMemo(
    () => ({
      kuery,
      from,
      to,
      startIndex: 0,
      endIndex: 10,
    }),
    [kuery, from, to]
  );

  const { error, loading, response } = useProfilingFunctionsData({
    isActive: activeTabId === ContentTabIds.PROFILING,
    params,
  });

  if (error !== null) {
    return <ErrorPrompt />;
  }

  if (!loading && response?.TotalCount === 0) {
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
      <EmbeddableFunctions
        data={response ?? undefined}
        isLoading={loading}
        rangeFrom={from}
        rangeTo={to}
      />
    </>
  );
}
