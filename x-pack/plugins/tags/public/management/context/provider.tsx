/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { ToastsProvider } from '../../../../../../src/plugins/kibana_react/public';
import { TagsManagementServices } from '../services';
import { ServicesProvider } from './services';
import { TagsProvider } from '../../context';

export interface Props {
  services: TagsManagementServices;
}

export const Provider: React.FC<Props> = ({ services, children }) => (
  <TagsProvider value={services.params.tags}>
    <ServicesProvider value={services}>
      <ToastsProvider value={services.params.toasts}>
        <Router history={services.params.history}>{children}</Router>
      </ToastsProvider>
    </ServicesProvider>
  </TagsProvider>
);
