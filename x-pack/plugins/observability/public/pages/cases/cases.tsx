/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useHasData } from '../../hooks/use_has_data';
import { Cases } from './components/cases';
import { LoadingObservability } from '../../components/loading_observability';
import { CaseFeatureNoPermissions } from './components/feature_no_permissions';
import { getNoDataConfig } from '../../utils/no_data_config';

export function CasesPage() {
  const userCasesPermissions = useGetUserCasesPermissions();
  const { docLinks, http } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  const { hasAnyData, isAllRequestsComplete } = useHasData();

  if (!hasAnyData && !isAllRequestsComplete) {
    return <LoadingObservability />;
  }

  // If there is any data, set hasData to true otherwise we need to wait till all the data is loaded before setting hasData to true or false; undefined indicates the data is still loading.
  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: http.basePath,
    docsLink: docLinks.links.observability.guide,
  });

  return userCasesPermissions.read ? (
    <ObservabilityPageTemplate
      isPageDataLoaded={isAllRequestsComplete}
      data-test-subj={noDataConfig ? 'noDataPage' : undefined}
      noDataConfig={noDataConfig}
    >
      <Cases permissions={userCasesPermissions} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
}
