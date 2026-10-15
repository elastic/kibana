/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { Breadcrumb } from '../breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useDiscoverHref } from '../../shared/links/discover_links/use_discover_href';
import { ApmIndexSettingsContextProvider } from '../../../context/apm_index_settings/apm_index_settings_context';
import { useApmIndexSettingsContext } from '../../../context/apm_index_settings/use_apm_index_settings_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { APM_EBT_ACTIONS } from '../ebt_constants';
import { TRACE_OVERVIEW_EBT_ELEMENTS } from './ebt_constants';

const tracesTitle = i18n.translate('xpack.apm.views.traceOverview.title', {
  defaultMessage: 'Traces',
});

const exploreTracesLabel = i18n.translate('xpack.apm.tracesOverview.exploreTracesInDiscover', {
  defaultMessage: 'Explore traces',
});

export function TraceOverview({
  children,
  searchBar,
}: {
  children: React.ReactElement;
  searchBar?: React.ReactNode;
}) {
  return (
    <ApmIndexSettingsContextProvider>
      <Breadcrumb href="/traces" title={tracesTitle} omitOnServerless>
        <TraceOverviewContent searchBar={searchBar}>{children}</TraceOverviewContent>
      </Breadcrumb>
    </ApmIndexSettingsContextProvider>
  );
}

function TraceOverviewContent({
  children,
  searchBar,
}: {
  children: React.ReactElement;
  searchBar?: React.ReactNode;
}) {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/traces');
  const { indexSettingsStatus } = useApmIndexSettingsContext();

  const discoverHref = useDiscoverHref({
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: { kuery, environment, sortDirection: 'DESC' },
  });

  const isExploreReady = Boolean(discoverHref) && indexSettingsStatus === FETCH_STATUS.SUCCESS;

  const pageMenu = useMemo<AppMenuConfig>(() => {
    return {
      primaryActionItem: {
        id: 'exploreTraces',
        label: exploreTracesLabel,
        iconType: 'discoverApp',
        testId: 'apmTracesExploreInDiscoverButton',
        ebt: {
          action: APM_EBT_ACTIONS.EXPLORE_TRACES,
          detail: TRACE_OVERVIEW_EBT_ELEMENTS.PAGE_HEADER,
        },
        disableButton: !isExploreReady,
        isLoading: indexSettingsStatus === FETCH_STATUS.LOADING,
        ...(discoverHref ? { href: discoverHref } : { run: () => undefined }),
      },
    };
  }, [discoverHref, indexSettingsStatus, isExploreReady]);

  return (
    <ApmMainTemplate
      header={{
        title: tracesTitle,
        menu: pageMenu,
      }}
      searchBar={searchBar}
      pageSectionProps={{
        contentProps: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            minInlineSize: 0,
          },
        },
      }}
    >
      {children}
    </ApmMainTemplate>
  );
}
