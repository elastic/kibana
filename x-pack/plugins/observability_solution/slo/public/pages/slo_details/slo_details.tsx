/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useIsMutating } from '@tanstack/react-query';
import { EuiLoadingSpinner, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core-http-browser';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import dedent from 'dedent';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useSloDetailsTabs } from './hooks/use_slo_details_tabs';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import PageNotFound from '../404';
import {
  ALERTS_TAB_ID,
  OVERVIEW_TAB_ID,
  SloDetails,
  TAB_ID_URL_PARAM,
  SloTabId,
} from './components/slo_details';
import { HeaderTitle } from './components/header_title';
import { HeaderControl } from './components/header_control';
import { paths } from '../../../common/locators/paths';
import type { SloDetailsPathParams } from './types';
import { AutoRefreshButton } from '../../components/slo/auto_refresh_button';
import { useGetQueryParams } from './hooks/use_get_query_params';
import { useAutoRefreshStorage } from '../../components/slo/auto_refresh_button/hooks/use_auto_refresh_storage';

export function SloDetailsPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    observabilityAIAssistant,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { search } = useLocation();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  const { sloId } = useParams<SloDetailsPathParams>();
  const { instanceId: sloInstanceId, remoteName } = useGetQueryParams();
  const { storeAutoRefreshState, getAutoRefreshState } = useAutoRefreshStorage();
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(getAutoRefreshState());
  const { isLoading, data: slo } = useFetchSloDetails({
    sloId,
    remoteName,
    instanceId: sloInstanceId,
    shouldRefetch: isAutoRefreshing,
  });
  const isDeleting = Boolean(useIsMutating(['deleteSlo']));

  const [selectedTabId, setSelectedTabId] = useState(() => {
    const searchParams = new URLSearchParams(search);
    const urlTabId = searchParams.get(TAB_ID_URL_PARAM);
    return urlTabId && [OVERVIEW_TAB_ID, ALERTS_TAB_ID].includes(urlTabId)
      ? (urlTabId as SloTabId)
      : OVERVIEW_TAB_ID;
  });

  const { tabs } = useSloDetailsTabs({
    slo,
    isAutoRefreshing,
    selectedTabId,
    setSelectedTabId,
  });

  useBreadcrumbs(getBreadcrumbs(basePath, slo));

  useEffect(() => {
    if (!slo || !observabilityAIAssistant) {
      return;
    }

    return observabilityAIAssistant.service.setScreenContext({
      screenDescription: dedent(`
        The user is looking at the detail page for the following SLO

        Name: ${slo.name}.
        Id: ${slo.id}
        Instance Id: ${slo.instanceId}
        Description: ${slo.description}
        Observed value: ${slo.summary.sliValue}
        Status: ${slo.summary.status}
      `),
      data: [
        {
          name: 'slo',
          description: 'The SLO and its metadata',
          value: slo,
        },
      ],
    });
  }, [observabilityAIAssistant, slo]);

  const isSloNotFound = !isLoading && slo === undefined;
  if (isSloNotFound) {
    return <PageNotFound />;
  }

  if (hasRightLicense === false) {
    navigateToUrl(basePath.prepend(paths.slos));
  }

  const isPerformingAction = isLoading || isDeleting;

  const handleToggleAutoRefresh = () => {
    setIsAutoRefreshing(!isAutoRefreshing);
    storeAutoRefreshState(!isAutoRefreshing);
  };

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: slo?.name ?? <EuiSkeletonText lines={1} />,
        children: <HeaderTitle isLoading={isPerformingAction} slo={slo} />,
        rightSideItems: [
          <HeaderControl isLoading={isPerformingAction} slo={slo} />,
          <AutoRefreshButton
            disabled={isPerformingAction}
            isAutoRefreshing={isAutoRefreshing}
            onClick={handleToggleAutoRefresh}
          />,
        ],
        tabs,
      }}
      data-test-subj="sloDetailsPage"
    >
      <HeaderMenu />
      {isLoading && <EuiLoadingSpinner data-test-subj="sloDetailsLoading" />}
      {!isLoading && (
        <SloDetails slo={slo!} isAutoRefreshing={isAutoRefreshing} selectedTabId={selectedTabId} />
      )}
    </ObservabilityPageTemplate>
  );
}

function getBreadcrumbs(
  basePath: IBasePath,
  slo: SLOWithSummaryResponse | undefined
): ChromeBreadcrumb[] {
  return [
    {
      href: basePath.prepend(paths.slos),
      text: i18n.translate('xpack.slo.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
      deepLinkId: 'slo',
    },
    {
      text:
        slo?.name ??
        i18n.translate('xpack.slo.breadcrumbs.sloDetailsLinkText', {
          defaultMessage: 'Details',
        }),
    },
  ];
}
