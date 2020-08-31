/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Route, Switch } from 'react-router-dom';
import { CaseDetailsPage } from './case_details';
import { CasesPage } from './case';
import { CreateCasePage } from './create_case';
import { ConfigureCasesPage } from './configure_cases';

const casesPagePath = '';
const caseDetailsPagePath = `${casesPagePath}/:detailName`;
const caseDetailsPagePathWithCommentId = `${casesPagePath}/:detailName/:commentId`;
const createCasePagePath = `${casesPagePath}/create`;
const configureCasesPagePath = `${casesPagePath}/configure`;

const CaseContainerComponent: React.FC = () => (
  <Switch>
    <Route path={createCasePagePath}>
      <CreateCasePage />
    </Route>
    <Route path={configureCasesPagePath}>
      <ConfigureCasesPage />
    </Route>
    <Route path={caseDetailsPagePathWithCommentId}>
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

export const Case = React.memo(CaseContainerComponent);
