/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { observabilityFeatureId } from '../../../common';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useHasData } from '../../hooks/use_has_data';
import { Cases } from './components/cases';
import { LoadingObservability } from '../../components/loading_observability';
import { CaseFeatureNoPermissions } from './components/feature_no_permissions';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';

export function CasesPage() {
  const { ObservabilityPageTemplate } = usePluginContext();

  const { canUseCases } = useKibana().services.cases.helpers;
  const userCasesPermissions = canUseCases([observabilityFeatureId]);

  const { hasAnyData, isAllRequestsComplete } = useHasData();

  if (!hasAnyData && !isAllRequestsComplete) {
    return <LoadingObservability />;
  }

  return userCasesPermissions.read ? (
    <ObservabilityPageTemplate isPageDataLoaded data-test-subj="o11yCasesPage">
      <HeaderMenu />
      <Cases permissions={userCasesPermissions} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
}
