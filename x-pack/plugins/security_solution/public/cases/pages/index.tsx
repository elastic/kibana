/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import * as i18n from './translations';
import { CaseDetailsPage } from './case_details';
import { CasesPage } from './case';
import { CreateCasePage } from './create_case';
import { ConfigureCasesPage } from './configure_cases';
import { useGetUserCasesPermissions, useKibana } from '../../common/lib/kibana';

const casesPagePath = '';
const caseDetailsPagePath = `${casesPagePath}/:detailName`;
const subCaseDetailsPagePath = `${caseDetailsPagePath}/sub-cases/:subCaseId`;
const caseDetailsPagePathWithCommentId = `${caseDetailsPagePath}/:commentId`;
const subCaseDetailsPagePathWithCommentId = `${subCaseDetailsPagePath}/:commentId`;
const createCasePagePath = `${casesPagePath}/create`;
const configureCasesPagePath = `${casesPagePath}/configure`;

const CaseContainerComponent: React.FC = () => {
  const userPermissions = useGetUserCasesPermissions();
  const chrome = useKibana().services.chrome;

  useEffect(() => {
    // if the user is read only then display the glasses badge in the global navigation header
    if (userPermissions != null && !userPermissions.crud && userPermissions.read) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
        iconType: 'glasses',
      });
    }

    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [userPermissions, chrome]);

  return (
    <Switch>
      <Route path={createCasePagePath}>
        <CreateCasePage />
      </Route>
      <Route path={configureCasesPagePath}>
        <ConfigureCasesPage />
      </Route>
      <Route exact path={subCaseDetailsPagePathWithCommentId}>
        <CaseDetailsPage />
      </Route>
      <Route exact path={caseDetailsPagePathWithCommentId}>
        <CaseDetailsPage />
      </Route>
      <Route exact path={subCaseDetailsPagePath}>
        <CaseDetailsPage />
      </Route>
      <Route path={caseDetailsPagePath}>
        <CaseDetailsPage />
      </Route>
      <Route strict exact path={casesPagePath}>
        <CasesPage />
      </Route>
    </Switch>
  );
};

export const Case = React.memo(CaseContainerComponent);
