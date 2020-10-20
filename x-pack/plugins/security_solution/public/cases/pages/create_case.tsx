/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';

import { SecurityPageName } from '../../app/types';
import { getCaseUrl } from '../../common/components/link_to';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUserSavedObjectPermissions } from '../../common/lib/kibana';
import { navTabs } from '../../app/home/home_navigations';
import { CaseHeaderPage } from '../components/case_header_page';
import { Create } from '../components/create';
import * as i18n from './translations';

export const CreateCasePage = React.memo(() => {
  const { replace: historyReplace } = useHistory();
  const location = useLocation();
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

  if (userPermissions != null && !userPermissions.crud) {
    historyReplace(getCaseUrl(search));
    return null;
  }

  return (
    <WrapperPage>
      <CaseHeaderPage backOptions={backOptions} title={i18n.CREATE_TITLE} />
      <Create />
    </WrapperPage>
  );
});

CreateCasePage.displayName = 'CreateCasePage';
