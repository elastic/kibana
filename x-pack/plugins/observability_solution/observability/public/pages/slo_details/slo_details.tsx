/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { IBasePath } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useIsMutating } from '@tanstack/react-query';
import dedent from 'dedent';
import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { paths } from '../../../common/locators/paths';
import { ObservabilityAppPageTemplate } from '../../components/observability_app_page_template';
import { AutoRefreshButton } from '../../components/slo/auto_refresh_button';
import { useAutoRefreshStorage } from '../../components/slo/auto_refresh_button/hooks/use_auto_refresh_storage';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import { useKibana } from '../../utils/kibana_react';
import PageNotFound from '../404';
import { HeaderControl } from './components/header_control';
import { HeaderTitle } from './components/header_title';
import {
  ALERTS_TAB_ID,
  OVERVIEW_TAB_ID,
  SloDetails,
  SloTabId,
  TAB_ID_URL_PARAM,
} from './components/slo_details';
import { useGetInstanceIdQueryParam } from './hooks/use_get_instance_id_query_param';
import { useSloDetailsTabs } from './hooks/use_slo_details_tabs';
import type { SloDetailsPathParams } from './types';

export function SloDetailsPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    observabilityAIAssistant: {
      service: { setScreenContext },
    },
  } = useKibana().services;
  const { search } = useLocation();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  const { sloId } = useParams<SloDetailsPathParams>();
  const sloInstanceId = useGetInstanceIdQueryParam();
  const { storeAutoRefreshState, getAutoRefreshState } = useAutoRefreshStorage();
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(getAutoRefreshState());
  const { isLoading, data: slo } = useFetchSloDetails({
    sloId,
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
    if (!slo) {
      return;
    }

    return setScreenContext({
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
  }, [setScreenContext, slo]);

  const isSloNotFound = !isLoading && slo === undefined;
  if (isSloNotFound) {
    return <PageNotFound />;
  }

  if (hasRightLicense === false) {
    navigateToUrl(basePath.prepend(paths.observability.slos));
  }

  const isPerformingAction = isLoading || isDeleting;

  const handleToggleAutoRefresh = () => {
    setIsAutoRefreshing(!isAutoRefreshing);
    storeAutoRefreshState(!isAutoRefreshing);
  };

  return (
    <ObservabilityAppPageTemplate
      pageHeader={{
        pageTitle: <HeaderTitle isLoading={isPerformingAction} slo={slo} />,
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
      {isLoading && <EuiLoadingSpinner data-test-subj="sloDetailsLoading" />}
      {!isLoading && (
        <SloDetails slo={slo!} isAutoRefreshing={isAutoRefreshing} selectedTabId={selectedTabId} />
      )}
    </ObservabilityAppPageTemplate>
  );
}

function getBreadcrumbs(
  basePath: IBasePath,
  slo: SLOWithSummaryResponse | undefined
): ChromeBreadcrumb[] {
  return [
    {
      href: basePath.prepend(paths.observability.slos),
      text: i18n.translate('xpack.observability.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
      deepLinkId: 'observability-overview:slos',
    },
    {
      text:
        slo?.name ??
        i18n.translate('xpack.observability.breadcrumbs.sloDetailsLinkText', {
          defaultMessage: 'Details',
        }),
    },
  ];
}
