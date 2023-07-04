/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockServices } from './services.mock';

export const KibanaServicesProvider: React.FC = ({ children }) => (
  <I18nProvider>
    <KibanaContextProvider services={mockServices}>{children}</KibanaContextProvider>
  </I18nProvider>
);

export const useKibana = jest.fn(() => ({ services: mockServices }));
