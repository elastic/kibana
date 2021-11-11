/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AllCases } from '../../components/app/cases/all_cases';

import { CaseFeatureNoPermissions } from './feature_no_permissions';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useReadonlyHeader } from '../../hooks/use_readonly_header';
import { casesBreadcrumbs } from './links';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useHasData } from '../../hooks/use_has_data';
import { LoadingObservability } from '../overview/loading_observability';
import { getNoDataConfig } from '../../utils/no_data_config';

export const AllCasesPage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const { core, ObservabilityPageTemplate } = usePluginContext();
  useReadonlyHeader();
  useBreadcrumbs([casesBreadcrumbs.cases]);

  const { hasAnyData, isAllRequestsComplete } = useHasData();

  if (!hasAnyData && !isAllRequestsComplete) {
    return <LoadingObservability />;
  }

  // If there is any data, set hasData to true otherwise we need to wait till all the data is loaded before setting hasData to true or false; undefined indicates the data is still loading.
  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: core.http.basePath,
    docsLink: core.docLinks.links.observability.guide,
  });

  return userPermissions == null || userPermissions?.read ? (
    <ObservabilityPageTemplate
      data-test-subj={noDataConfig ? 'noDataPage' : undefined}
      noDataConfig={noDataConfig}
    >
      <AllCases userCanCrud={userPermissions?.crud ?? false} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
});

AllCasesPage.displayName = 'AllCasesPage';
