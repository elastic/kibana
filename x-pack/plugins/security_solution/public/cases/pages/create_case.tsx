/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { SecurityPageName } from '../../app/types';
import { getCaseUrl } from '../../common/components/link_to';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUserSavedObjectPermissions } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { navTabs } from '../../app/home/home_navigations';
import { CaseHeaderPage } from '../components/case_header_page';
import { Create } from '../components/create';
import * as i18n from './translations';

export const CreateCasePage = React.memo(() => {
  const history = useHistory();
  const userPermissions = useGetUserSavedObjectPermissions();
  const search = useGetUrlSearch(navTabs.case);

  const backOptions = useMemo(
    () => ({
      href: getCaseUrl(search),
      text: i18n.BACK_TO_ALL,
      pageId: SecurityPageName.case,
    }),
    [search]
  );

  if (userPermissions != null && !userPermissions.crud) {
    history.replace(getCaseUrl(search));
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
