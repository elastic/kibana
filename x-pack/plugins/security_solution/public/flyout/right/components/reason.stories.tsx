/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { Reason } from './reason';
import { RightPanelContext } from '../context';
import { mockDataAsNestedObject, mockDataFormattedForFieldBrowser } from '../mocks/mock_context';

export default {
  component: Reason,
  title: 'Flyout/Reason',
};

export const Default: Story<void> = () => {
  const panelContextValue = {
    dataAsNestedObject: mockDataAsNestedObject,
    dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  } as unknown as RightPanelContext;

  return (
    <StorybookProviders>
      <RightPanelContext.Provider value={panelContextValue}>
        <Reason />
      </RightPanelContext.Provider>
    </StorybookProviders>
  );
};

export const Empty: Story<void> = () => {
  const panelContextValue = {
    dataFormattedForFieldBrowser: {},
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={panelContextValue}>
      <Reason />
    </RightPanelContext.Provider>
  );
};
