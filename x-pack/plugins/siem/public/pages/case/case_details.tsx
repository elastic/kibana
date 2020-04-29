/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useParams, Redirect } from 'react-router-dom';

import { useGetUrlSearch } from '../../components/navigation/use_get_url_search';
import { useGetUserSavedObjectPermissions } from '../../lib/kibana';
import { SpyRoute } from '../../utils/route/spy_routes';
import { getCaseUrl } from '../../components/link_to';
import { navTabs } from '../home/home_navigations';
import { CaseView } from './components/case_view';
import { savedObjectReadOnly, CaseCallOut } from './components/callout';

export const CaseDetailsPage = React.memo(() => {
  const userPermissions = useGetUserSavedObjectPermissions();
  const { detailName: caseId } = useParams();
  const search = useGetUrlSearch(navTabs.case);

  if (userPermissions != null && !userPermissions.read) {
    return <Redirect to={getCaseUrl(search)} />;
  }

  return caseId != null ? (
    <>
      {userPermissions != null && !userPermissions?.crud && userPermissions?.read && (
        <CaseCallOut title={savedObjectReadOnly.title} message={savedObjectReadOnly.description} />
      )}
      <CaseView caseId={caseId} userCanCrud={userPermissions?.crud ?? false} />
      <SpyRoute />
    </>
  ) : null;
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
