/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { SecurityPageName } from '../../app/types';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { useGetUserCasesPermissions, useKibana } from '../../common/lib/kibana';
import { getCaseUrl } from '../../common/components/link_to';
import { navTabs } from '../../app/home/home_navigations';
import { CaseView } from '../components/case_view';
import { CASES_SUB_PLUGIN_ID } from '../../../common/constants';

export const CaseDetailsPage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const { detailName: caseId, subCaseId } = useParams<{
    detailName?: string;
    subCaseId?: string;
  }>();
  const search = useGetUrlSearch(navTabs.case);
  const {
    application: { navigateToApp },
  } = useKibana().services;

  useEffect(() => {
    if (userPermissions != null && !userPermissions.read) {
      navigateToApp(CASES_SUB_PLUGIN_ID, { path: getCaseUrl(search) });
    }
  }, [navigateToApp, userPermissions, search]);

  return caseId != null ? (
    <>
      <WrapperPage noPadding>
        <CaseView
          caseId={caseId}
          subCaseId={subCaseId}
          userCanCrud={userPermissions?.crud ?? false}
        />
      </WrapperPage>
      <SpyRoute pageName={SecurityPageName.case} />
    </>
  ) : null;
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
