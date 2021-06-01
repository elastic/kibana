/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';

import { AllCases } from '../../components/app/cases/all_cases';
import * as i18n from '../../components/app/cases/translations';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';

import { savedObjectReadOnlyErrorMessage, CaseCallOut } from '../../components/app/cases/callout';
import { CaseFeatureNoPermissions } from './feature_no_permissions';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';

export const AllCasesPage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  return userPermissions == null || userPermissions?.read ? (
    <>
      {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
        <CaseCallOut
          title={savedObjectReadOnlyErrorMessage.title}
          messages={[{ ...savedObjectReadOnlyErrorMessage, title: '' }]}
        />
      )}
      <EuiPageTemplate
        pageHeader={{
          pageTitle: (
            <>
              {i18n.PAGE_TITLE} <ExperimentalBadge />
            </>
          ),
        }}
      >
        <AllCases userCanCrud={userPermissions?.crud ?? false} />
      </EuiPageTemplate>
    </>
  ) : (
    <CaseFeatureNoPermissions />
  );
});

AllCasesPage.displayName = 'AllCasesPage';
