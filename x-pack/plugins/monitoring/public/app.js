/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getRoutes } from './routes';
import { Header } from './components/header';
import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageContent } from '@elastic/eui';

export const MonitoringApp = ({ basePath }) => {
  return (
    <EuiPage className="monitoringApp">
      <EuiPageBody>
        <EuiPageHeader>
          <Header/>
        </EuiPageHeader>
        <EuiPageContent>
          {getRoutes(basePath)}
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

