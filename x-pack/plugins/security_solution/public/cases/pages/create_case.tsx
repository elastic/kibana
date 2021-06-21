/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { SecurityPageName } from '../../app/types';
import { getCaseUrl } from '../../common/components/link_to';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUserCasesPermissions, useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { navTabs } from '../../app/home/home_navigations';
import { CaseHeaderPage } from '../components/case_header_page';
import { Create } from '../components/create';
import * as i18n from './translations';
import { CASES_APP_ID } from '../../../common/constants';

export const CreateCasePage = React.memo(() => {
  const userPermissions = useGetUserCasesPermissions();
  const search = useGetUrlSearch(navTabs.case);
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const backOptions = useMemo(
    () => ({
      href: getCaseUrl(search),
      text: i18n.BACK_TO_ALL,
      pageId: SecurityPageName.case,
    }),
    [search]
  );

  if (userPermissions != null && !userPermissions.crud) {
    navigateToApp(CASES_APP_ID, {
      path: getCaseUrl(search),
    });
    return null;
  }

  return (
    <>
      <WrapperPage>
        <CaseHeaderPage backOptions={backOptions} title={i18n.CREATE_TITLE} />
        <Create />
      </WrapperPage>
      <SpyRoute pageName={SecurityPageName.case} />
    </>
  );
});

CreateCasePage.displayName = 'CreateCasePage';
