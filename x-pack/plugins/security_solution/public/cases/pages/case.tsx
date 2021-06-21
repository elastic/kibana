/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUserCasesPermissions } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { AllCases } from '../components/all_cases';

import { permissionsReadOnlyErrorMessage, CaseCallOut } from '../components/callout';
import { CaseFeatureNoPermissions } from './feature_no_permissions';
import { SecurityPageName } from '../../app/types';

export const CasesPage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();

  return userPermissions == null || userPermissions?.read ? (
    <>
      <WrapperPage>
        {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
          <CaseCallOut
            title={permissionsReadOnlyErrorMessage.title}
            messages={[{ ...permissionsReadOnlyErrorMessage, title: '' }]}
          />
        )}
        <AllCases userCanCrud={userPermissions?.crud ?? false} />
      </WrapperPage>
      <SpyRoute pageName={SecurityPageName.case} />
    </>
  ) : (
    <CaseFeatureNoPermissions />
  );
});

CasesPage.displayName = 'CasesPage';
