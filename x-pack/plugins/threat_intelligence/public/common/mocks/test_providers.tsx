/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VFC } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '../../hooks/use_kibana';
import { mockUiSetting } from './mock_kibana_ui_setting';

interface Props {
  children: React.ReactNode;
}

export const TestProvidersComponent: VFC<Props> = ({ children }) => {
  const mockCoreStart = coreMock.createStart();
  mockCoreStart.uiSettings.get.mockImplementation(mockUiSetting);

  return (
    <I18nProvider>
      <KibanaContextProvider services={mockCoreStart}>{children}</KibanaContextProvider>
    </I18nProvider>
  );
};
