/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useIsMutating } from '@tanstack/react-query';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core-http-browser';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import dedent from 'dedent';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
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
import { useGetInstanceIdQueryParam } from './hooks/use_get_instance_id_query_param';
import { useAutoRefreshStorage } from '../../components/slo/auto_refresh_button/hooks/use_auto_refresh_storage';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';

export function SloDetailsPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    observabilityAIAssistant: {
      service: { setScreenContext },
    },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
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

  const handleSelectedTab = (newTabId: SloTabId) => {
    setSelectedTabId(newTabId);
  };

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
    <ObservabilityPageTemplate
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
        bottomBorder: false,
      }}
      data-test-subj="sloDetailsPage"
    >
      <HeaderMenu />
      {isLoading && <EuiLoadingSpinner data-test-subj="sloDetailsLoading" />}
      {!isLoading && (
        <SloDetails
          slo={slo!}
          isAutoRefreshing={isAutoRefreshing}
          selectedTabId={selectedTabId}
          handleSelectedTab={handleSelectedTab}
        />
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
