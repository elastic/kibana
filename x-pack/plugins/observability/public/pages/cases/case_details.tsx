/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
// import { useGetUserCasesPermissions } from '../../../../security_solution/public/common/lib/kibana';

import { CaseView } from '../../components/app/cases/case_view';

export const CaseDetailsPage = React.memo(() => {
  const history = useHistory();
  // const userPermissions = useGetUserCasesPermissions();
  const { detailName: caseId, subCaseId } = useParams<{
    detailName?: string;
    subCaseId?: string;
  }>();
  //
  // if (userPermissions != null && !userPermissions.read) {
  //   history.replace(getCaseUrl(search));
  //   return null;
  // }

  return caseId != null ? (
    <>
      {/* {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (*/}
      {/*  <CaseCallOut*/}
      {/*    title={savedObjectReadOnlyErrorMessage.title}*/}
      {/*    messages={[{ ...savedObjectReadOnlyErrorMessage, title: '' }]}*/}
      {/*  />*/}
      {/* )}*/}
      <CaseView caseId={caseId} subCaseId={subCaseId} userCanCrud={true} />
    </>
  ) : null;
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
