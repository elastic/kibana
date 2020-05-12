/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUserSavedObjectPermissions } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { AllCases } from '../components/all_cases';

import { savedObjectReadOnly, CaseCallOut } from '../components/callout';
import { CaseSavedObjectNoPermissions } from './saved_object_no_permissions';

export const CasesPage = React.memo(() => {
  const userPermissions = useGetUserSavedObjectPermissions();

  return userPermissions == null || userPermissions?.read ? (
    <>
      <WrapperPage>
        {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
          <CaseCallOut
            title={savedObjectReadOnly.title}
            message={savedObjectReadOnly.description}
          />
        )}
        <AllCases userCanCrud={userPermissions?.crud ?? false} />
      </WrapperPage>
      <SpyRoute />
    </>
  ) : (
    <CaseSavedObjectNoPermissions />
  );
});

CasesPage.displayName = 'CasesPage';
