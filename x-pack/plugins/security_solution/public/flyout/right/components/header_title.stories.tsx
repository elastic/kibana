/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { mockDataFormattedForFieldBrowser, mockGetFieldsData } from '../mocks/mock_context';
import { mockUiSettingsService } from '../mocks/mock_kibana_ui_settings_service';
import { RightPanelContext } from '../context';
import { HeaderTitle } from './header_title';

export default {
  component: HeaderTitle,
  title: 'Flyout/HeaderTitle',
};

const KibanaReactContext = createKibanaReactContext({
  settings: {
    client: mockUiSettingsService(),
  },
} as unknown as CoreStart);

export const IsAlert: Story<void> = () => {
  const contextValue = {
    dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    getFieldsData: mockGetFieldsData,
  } as unknown as RightPanelContext;

  return (
    <KibanaReactContext.Provider>
      <RightPanelContext.Provider value={contextValue}>
        <HeaderTitle />
      </RightPanelContext.Provider>
    </KibanaReactContext.Provider>
  );
};

export const IsNotAlert: Story<void> = () => {
  const contextValue = {
    dataFormattedForFieldBrowser: [
      {
        category: 'kibana',
        field: 'kibana.alert.rule.name',
        values: ['test'],
        originalValue: ['test'],
        isObjectArray: false,
      },
      {
        category: 'base',
        field: '@timestamp',
        values: ['2023-01-01T01:01:01.000Z'],
        originalValue: ['2023-01-01T01:01:01.000Z'],
        isObjectArray: false,
      },
    ],
    getFieldsData: mockGetFieldsData,
  } as unknown as RightPanelContext;

  return (
    <KibanaReactContext.Provider>
      <RightPanelContext.Provider value={contextValue}>
        <HeaderTitle />
      </RightPanelContext.Provider>
    </KibanaReactContext.Provider>
  );
};

export const NoTimestamp: Story<void> = () => {
  const contextValue = {
    dataFormattedForFieldBrowser: [
      {
        category: 'kibana',
        field: 'kibana.alert.rule.name',
        values: ['test'],
        originalValue: ['test'],
        isObjectArray: false,
      },
    ],
    getFieldsData: mockGetFieldsData,
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <HeaderTitle />
    </RightPanelContext.Provider>
  );
};

export const Emtpy: Story<void> = () => {
  const contextValue = {
    getFieldsData: () => [],
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <HeaderTitle />
    </RightPanelContext.Provider>
  );
};
