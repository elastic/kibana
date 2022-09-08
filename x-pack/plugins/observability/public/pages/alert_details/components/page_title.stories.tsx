/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { Alert } from '../types';

import { PageTitle as Component } from './page_title';

export default {
  component: Component,
  title: 'app/AlertDetails/PageTitle',
};

const alert: Alert = {
  alertId: 'alertId',
  ruleId: 'ruleId',
  name: 'Avg latency is 84% above the threshold',
  updatedAt: '2022-09-06',
  updatedBy: 'Elastic',
  createdAt: '2022-09-06',
  createdBy: 'Elastic',
};

export const PageTitle = () => {
  return <Component alert={alert} />;
};

export const PageTitleUsedInObservabilityPageTemplate = () => {
  return (
    <EuiPageTemplate
      pageHeader={{
        pageTitle: <Component alert={alert} />,
        bottomBorder: false,
      }}
    >
      <></>
    </EuiPageTemplate>
  );
};
