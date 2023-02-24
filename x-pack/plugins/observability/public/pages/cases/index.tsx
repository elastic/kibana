/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Cases } from './cases';

import { CaseFeatureNoPermissions } from './feature_no_permissions';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LoadingObservability } from '../overview';
import { getNoDataConfig } from '../../utils/no_data_config';
import { ObservabilityAppServices } from '../../application/types';
import { useFetchObservabilityAlerts } from '../../hooks/use_fetch_observability_alerts';

export const CasesPage = React.memo(() => {
  const userCasesPermissions = useGetUserCasesPermissions();
  const { docLinks, http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  const { alerts, isLoading, isSuccess, isError } = useFetchObservabilityAlerts();

  if (isLoading) {
    return <LoadingObservability />;
  }

  const noDataConfig = getNoDataConfig({
    hasData: alerts && alerts.length > 0,
    basePath: http.basePath,
    docsLink: docLinks.links.observability.guide,
  });

  return userCasesPermissions.read ? (
    <ObservabilityPageTemplate
      isPageDataLoaded={isSuccess || isError}
      data-test-subj={noDataConfig ? 'noDataPage' : undefined}
      noDataConfig={noDataConfig}
    >
      <Cases permissions={userCasesPermissions} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
});

CasesPage.displayName = 'CasesPage';
