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
import { useHasData } from '../../hooks/use_has_data';
import { LoadingObservability } from '../overview/loading_observability';
import { getNoDataConfig } from '../../utils/no_data_config';
import { ObservabilityAppServices } from '../../application/types';

export const CasesPage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const { docLinks, http } = useKibana<ObservabilityAppServices>().services;
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

  return userPermissions == null || userPermissions?.read ? (
    <ObservabilityPageTemplate
      data-test-subj={noDataConfig ? 'noDataPage' : undefined}
      noDataConfig={noDataConfig}
    >
      <Cases userCanCrud={userPermissions?.crud ?? false} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
});

CasesPage.displayName = 'CasesPage';
