/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// import { useGetUserCasesPermissions } from '../../common/lib/kibana';
import { AllCases } from '../../components/app/cases/all_cases';

// import { savedObjectReadOnlyErrorMessage, CaseCallOut } from '../../components/app/cases/callout';
// import { CaseSavedObjectNoPermissions } from './saved_object_no_permissions';

export const AllCasesPage = React.memo(() => {
  // const userPermissions = useGetUserCasesPermissions();

  // userPermissions == null || userPermissions?.read ? (
  return (
    <>
      {/* {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (*/}
      {/*  <CaseCallOut*/}
      {/*    title={savedObjectReadOnlyErrorMessage.title}*/}
      {/*    messages={[{ ...savedObjectReadOnlyErrorMessage, title: '' }]}*/}
      {/*  />*/}
      {/* )}*/}
      <AllCases userCanCrud={true} />
    </>
  );
  //   )
  // : (
  //     <CaseSavedObjectNoPermissions />
  //   );
});

AllCasesPage.displayName = 'AllCasesPage';
