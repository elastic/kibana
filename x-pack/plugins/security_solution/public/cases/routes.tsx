/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { Case } from './pages';
import { CaseSettingsRegistry } from './types';
import { CaseSettingsContextProvider } from './settings_context';
import { NotFoundPage } from '../app/404';

export const createCaseRoutes = ({
  caseSettingsRegistry,
}: {
  caseSettingsRegistry: CaseSettingsRegistry;
}) => {
  const CasesRoutesComponent: React.FC = () => {
    return (
      <CaseSettingsContextProvider value={{ caseSettingsRegistry }}>
        <CasesRoutes />
      </CaseSettingsContextProvider>
    );
  };

  return CasesRoutesComponent;
};

export const CasesRoutes: React.FC = () => (
  <Switch>
    <Route path="/">
      <Case />
    </Route>
    <Route render={() => <NotFoundPage />} />
  </Switch>
);
