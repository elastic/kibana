/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams, useHistory } from 'react-router-dom';

import { SecurityPageName } from '../../app/types';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGetUrlSearch } from '../../common/components/navigation/use_get_url_search';
import { useGetUserSavedObjectPermissions } from '../../common/lib/kibana';
import { getCaseUrl } from '../../common/components/link_to';
import { navTabs } from '../../app/home/home_navigations';
import { CaseView } from '../components/case_view';
import { savedObjectReadOnlyErrorMessage, CaseCallOut } from '../components/callout';

export const CaseDetailsPage = React.memo(() => {
  const history = useHistory();
  const userPermissions = useGetUserSavedObjectPermissions();
  const { detailName: caseId, subCaseId } = useParams<{
    detailName?: string;
    subCaseId?: string;
  }>();
  const search = useGetUrlSearch(navTabs.case);

  if (userPermissions != null && !userPermissions.read) {
    history.replace(getCaseUrl(search));
    return null;
  }

  return caseId != null ? (
    <>
      <WrapperPage noPadding>
        {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
          <CaseCallOut
            title={savedObjectReadOnlyErrorMessage.title}
            messages={[{ ...savedObjectReadOnlyErrorMessage }]}
          />
        )}
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
