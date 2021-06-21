/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { CaseView } from '../../components/app/cases/case_view';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { useKibana } from '../../utils/kibana_react';
import { CASES_APP_ID } from '../../components/app/cases/constants';
import { CaseCallOut, permissionsReadOnlyErrorMessage } from '../../components/app/cases/callout';

export const CaseDetailsPage = React.memo(() => {
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const userPermissions = useGetUserCasesPermissions();
  const { detailName: caseId, subCaseId } = useParams<{
    detailName?: string;
    subCaseId?: string;
  }>();

  if (userPermissions != null && !userPermissions.read) {
    navigateToApp(`${CASES_APP_ID}`);
    return null;
  }

  return caseId != null ? (
    <>
      {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
        <CaseCallOut
          title={permissionsReadOnlyErrorMessage.title}
          messages={[{ ...permissionsReadOnlyErrorMessage, title: '' }]}
        />
      )}
      <CaseView
        caseId={caseId}
        subCaseId={subCaseId}
        userCanCrud={userPermissions?.crud ?? false}
      />
    </>
  ) : null;
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
