/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { TagsManagementServices } from '../services';
import { ServicesProvider } from './services';

export interface Props {
  services: TagsManagementServices;
}

export const Provider: React.FC<Props> = ({ services, children }) => (
  <ServicesProvider value={services}>
    <Router history={services.params.history}>{children}</Router>
  </ServicesProvider>
);
