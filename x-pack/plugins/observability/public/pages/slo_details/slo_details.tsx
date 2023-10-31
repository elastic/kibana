/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIsMutating } from '@tanstack/react-query';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core-http-browser';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import PageNotFound from '../404';
import { SloDetails } from './components/slo_details';
import { HeaderTitle } from './components/header_title';
import { HeaderControl } from './components/header_control';
import { paths } from '../../../common/locators/paths';
import type { SloDetailsPathParams } from './types';
import { AutoRefreshButton } from '../../components/slo/auto_refresh_button';
import { FeedbackButton } from '../../components/slo/feedback_button/feedback_button';
import { useGetInstanceIdQueryParam } from './hooks/use_get_instance_id_query_param';
import { useAutoRefreshStorage } from '../../components/slo/auto_refresh_button/hooks/use_auto_refresh_storage';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';

export function SloDetailsPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();

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
  const isCloningOrDeleting = Boolean(useIsMutating());

  useBreadcrumbs(getBreadcrumbs(basePath, slo));

  const isSloNotFound = !isLoading && slo === undefined;
  if (isSloNotFound) {
    return <PageNotFound />;
  }

  if (hasRightLicense === false) {
    navigateToUrl(basePath.prepend(paths.observability.slos));
  }

  const isPerformingAction = isLoading || isCloningOrDeleting;

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
          <FeedbackButton disabled={isPerformingAction} />,
        ],
        bottomBorder: false,
      }}
      data-test-subj="sloDetailsPage"
    >
      <HeaderMenu />
      {isLoading && <EuiLoadingSpinner data-test-subj="sloDetailsLoading" />}
      {!isLoading && <SloDetails slo={slo!} isAutoRefreshing={isAutoRefreshing} />}
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
