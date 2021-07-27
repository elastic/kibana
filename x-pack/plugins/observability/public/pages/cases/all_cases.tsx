/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AllCases } from '../../components/app/cases/all_cases';
import * as i18n from '../../components/app/cases/translations';

import { CaseFeatureNoPermissions } from './feature_no_permissions';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useReadonlyHeader } from '../../hooks/use_readonly_header';
import { casesBreadcrumbs } from './links';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

export const AllCasesPage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const { ObservabilityPageTemplate } = usePluginContext();
  useReadonlyHeader();

  useBreadcrumbs([casesBreadcrumbs.cases]);

  return userPermissions == null || userPermissions?.read ? (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{i18n.PAGE_TITLE}</>,
      }}
    >
      <AllCases userCanCrud={userPermissions?.crud ?? false} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
});

AllCasesPage.displayName = 'AllCasesPage';
