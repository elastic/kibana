/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { CaseView } from '../../components/app/cases/case_view';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { useKibana } from '../../utils/kibana_react';
import { useReadonlyHeader } from '../../hooks/use_readonly_header';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { observabilityAppId } from '../../../common';

export const CaseDetailsPage = React.memo(() => {
  const {
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const casesUrl = `${getUrlForApp(observabilityAppId)}/cases`;
  const userPermissions = useGetUserCasesPermissions();
  const { detailName: caseId, subCaseId } = useParams<{
    detailName?: string;
    subCaseId?: string;
  }>();
  useReadonlyHeader();

  useEffect(() => {
    if (userPermissions != null && !userPermissions.read) {
      navigateToUrl(casesUrl);
    }
  }, [casesUrl, navigateToUrl, userPermissions]);

  return caseId != null ? (
    <ObservabilityPageTemplate>
      <CaseView
        caseId={caseId}
        subCaseId={subCaseId}
        userCanCrud={userPermissions?.crud ?? false}
      />
    </ObservabilityPageTemplate>
  ) : null;
});

CaseDetailsPage.displayName = 'CaseDetailsPage';
