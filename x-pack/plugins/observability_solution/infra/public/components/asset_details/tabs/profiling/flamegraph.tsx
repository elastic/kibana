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
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { ErrorPrompt } from './error_prompt';
import { ProfilingLinks } from './profiling_links';
import { EmptyDataPrompt } from './empty_data_prompt';
import { useRequestObservable } from '../../hooks/use_request_observable';

interface Props {
  kuery: string;
}

export function Flamegraph({ kuery }: Props) {
  const { services } = useKibanaContextForPlugin();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { isActiveTab } = useTabSwitcherContext();
  const { dateRange, getDateRangeInTimestamp } = useDatePickerContext();
  const { from, to } = getDateRangeInTimestamp();
  const { request$ } = useRequestObservable<BaseFlameGraph>();

  const profilingLinkLocator = services.observabilityShared.locators.profiling.flamegraphLocator;
  const profilingLinkLabel = i18n.translate('xpack.infra.flamegraph.profilingAppFlamegraphLink', {
    defaultMessage: 'Go to Universal Profiling Flamegraph',
  });

  const params = useMemo(() => ({ kuery, from, to }), [from, kuery, to]);

  const { data, status, error } = useFetcher(
    async (callApi) => {
      return callApi<BaseFlameGraph>('/api/infra/profiling/flamegraph', {
        method: 'GET',
        query: params,
      });
    },
    [params],
    {
      requestObservable$: request$,
      autoFetch: isActiveTab('profiling'),
    }
  );

  if (error) {
    return <ErrorPrompt />;
  }

  if (!isPending(status) && data?.TotalSamples === 0) {
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
      <EmbeddableFlamegraph data={data} isLoading={isPending(status)} height="60vh" />
    </>
  );
}
