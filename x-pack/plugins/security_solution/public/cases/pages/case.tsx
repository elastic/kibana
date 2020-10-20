/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUserSavedObjectPermissions } from '../../common/lib/kibana';
import { AllCases } from '../components/all_cases';

import { savedObjectReadOnlyErrorMessage, CaseCallOut } from '../components/callout';
import { CaseSavedObjectNoPermissions } from './saved_object_no_permissions';
import { SecurityPageName } from '../../app/types';

export const CasesPage = React.memo(() => {
  const { replace: historyReplace } = useHistory();
  const location = useLocation();
  const userPermissions = useGetUserSavedObjectPermissions();

  useEffect(() => {
    historyReplace({
      ...location,
      state: {
        ...(location.state ?? {}),
        pageName: SecurityPageName.case,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyReplace, location.pathname, location.state]);

  return userPermissions == null || userPermissions?.read ? (
    <>
      <WrapperPage>
        {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
          <CaseCallOut
            title={savedObjectReadOnlyErrorMessage.title}
            messages={[{ ...savedObjectReadOnlyErrorMessage }]}
          />
        )}
        <AllCases userCanCrud={userPermissions?.crud ?? false} />
      </WrapperPage>
    </>
  ) : (
    <CaseSavedObjectNoPermissions />
  );
});

CasesPage.displayName = 'CasesPage';
