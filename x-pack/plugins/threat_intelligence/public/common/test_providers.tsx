/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VFC } from 'react';
import { I18nProvider } from '@kbn/i18n-react';

interface Props {
  children: React.ReactNode;
}

export const TestProvidersComponent: VFC<Props> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);
