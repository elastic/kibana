/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { DocumentStatus } from './status';
import { RightPanelContext } from '../context';
import { mockBrowserFields, mockDataFormattedForFieldBrowser } from '../mocks/mock_context';

export default {
  component: DocumentStatus,
  title: 'Flyout/Status',
};

const flyoutContextValue = {
  closeFlyout: () => {},
} as unknown as ExpandableFlyoutContext;

export const Default: Story<void> = () => {
  const contextValue = {
    eventId: 'eventId',
    browserFields: mockBrowserFields,
    dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    scopeId: 'alerts-page',
  } as unknown as RightPanelContext;

  return (
    <StorybookProviders>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={contextValue}>
          <DocumentStatus />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </StorybookProviders>
  );
};

export const Empty: Story<void> = () => {
  const contextValue = {
    eventId: 'eventId',
    browserFields: {},
    dataFormattedForFieldBrowser: [],
    scopeId: 'scopeId',
  } as unknown as RightPanelContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={contextValue}>
        <DocumentStatus />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};
