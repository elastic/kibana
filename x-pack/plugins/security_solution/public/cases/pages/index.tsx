/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Route, Switch } from 'react-router-dom';
import { CaseDetailsPage } from './case_details';
import { CasesPage } from './case';
import { CreateCasePage } from './create_case';
import { ConfigureCasesPage } from './configure_cases';
import { CASES_PATH } from '../../../common/constants';

const caseDetailsPagePath = `${CASES_PATH}/:detailName`;
const subCaseDetailsPagePath = `${caseDetailsPagePath}/sub-cases/:subCaseId`;
const caseDetailsPagePathWithCommentId = `${caseDetailsPagePath}/:commentId`;
const subCaseDetailsPagePathWithCommentId = `${subCaseDetailsPagePath}/:commentId`;
const createCasePagePath = `${CASES_PATH}/create`;
const configureCasesPagePath = `${CASES_PATH}/configure`;

const CaseContainerComponent: React.FC = () => (
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
    <Route strict exact path={CASES_PATH}>
      <CasesPage />
    </Route>
  </Switch>
);

export const Case = React.memo(CaseContainerComponent);
