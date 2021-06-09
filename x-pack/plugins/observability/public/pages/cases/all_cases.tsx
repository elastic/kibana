/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AllCases } from '../../components/app/cases/all_cases';
import * as i18n from '../../components/app/cases/translations';

import { permissionsReadOnlyErrorMessage, CaseCallOut } from '../../components/app/cases/callout';
import { CaseFeatureNoPermissions } from './feature_no_permissions';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';

export const AllCasesPage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const { ObservabilityPageTemplate } = usePluginContext();
  return userPermissions == null || userPermissions?.read ? (
    <>
      {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
        <CaseCallOut
          title={permissionsReadOnlyErrorMessage.title}
          messages={[{ ...permissionsReadOnlyErrorMessage, title: '' }]}
        />
      )}
      <ObservabilityPageTemplate
        pageHeader={{
          pageTitle: <>{i18n.PAGE_TITLE}</>,
        }}
      >
        <AllCases userCanCrud={userPermissions?.crud ?? false} />
      </ObservabilityPageTemplate>
    </>
  ) : (
    <CaseFeatureNoPermissions />
  );
});

AllCasesPage.displayName = 'AllCasesPage';
