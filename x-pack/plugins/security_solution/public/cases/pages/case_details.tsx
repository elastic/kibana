/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';

import { SecurityPageName } from '../../app/types';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { useGetUserSavedObjectPermissions } from '../../common/lib/kibana';
import { getCaseUrl } from '../../common/components/link_to';
import { navTabs } from '../../app/home/home_navigations';
import { CaseView } from '../components/case_view';
import { savedObjectReadOnlyErrorMessage, CaseCallOut } from '../components/callout';

export const CaseDetailsPage = React.memo(() => {
  const { replace: historyReplace } = useHistory();
  const location = useLocation();
  const userPermissions = useGetUserSavedObjectPermissions();
  const { detailName: caseId } = useParams<{ detailName?: string }>();
  const search = useGetUrlSearch(navTabs.case);

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

  if (userPermissions != null && !userPermissions.read) {
    historyReplace(getCaseUrl(search));
    return null;
  }

  return caseId != null ? (
    <WrapperPage noPadding>
      {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
        <CaseCallOut
          title={savedObjectReadOnlyErrorMessage.title}
          messages={[{ ...savedObjectReadOnlyErrorMessage }]}
        />
      )}
      <CaseView caseId={caseId} userCanCrud={userPermissions?.crud ?? false} />
    </WrapperPage>
  ) : null;
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
