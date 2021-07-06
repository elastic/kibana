/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { SecurityPageName } from '../../app/types';
import { getCaseUrl } from '../../common/components/link_to';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGetUserCasesPermissions, useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { navTabs } from '../../app/home/home_navigations';
import { CaseHeaderPage } from '../components/case_header_page';
import { Create } from '../components/create';
import * as i18n from './translations';
import { APP_ID } from '../../../common/constants';

export const CreateCasePage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const search = useGetUrlSearch(navTabs.case);
  const {
    application: { navigateToApp },
  } = useKibana().services;

  const backOptions = useMemo(
    () => ({
      path: getCaseUrl(search),
      text: i18n.BACK_TO_ALL,
      pageId: SecurityPageName.case,
    }),
    [search]
  );

  useEffect(() => {
    if (userPermissions != null && !userPermissions.crud) {
      navigateToApp(APP_ID, {
        deepLinkId: SecurityPageName.case,
        path: getCaseUrl(search),
      });
    }
  }, [userPermissions, navigateToApp, search]);

  return (
    <>
      <SecuritySolutionPageWrapper>
        <CaseHeaderPage backOptions={backOptions} title={i18n.CREATE_TITLE} />
        <Create />
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.case} />
    </>
  );
});

CreateCasePage.displayName = 'CreateCasePage';
