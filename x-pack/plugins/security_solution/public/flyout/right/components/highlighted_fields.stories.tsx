/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { HighlightedFields } from './highlighted_fields';
import { RightPanelContext } from '../context';

export default {
  component: HighlightedFields,
  title: 'Flyout/HighlightedFields',
};

// TODO ideally we would want to have some data here, but we need to spent some time getting all the foundation items for storybook
//  (ReduxStoreProvider, CellActionsProvider...) similarly to how it was done for the TestProvidersComponent
//  see ticket https://github.com/elastic/security-team/issues/6223
export const Default: Story<void> = () => {
  const flyoutContextValue = {
    openRightPanel: () => window.alert('openRightPanel called'),
  } as unknown as ExpandableFlyoutContext;
  const panelContextValue = {
    eventId: 'eventId',
    indexName: 'indexName',
    dataFormattedForFieldBrowser: [],
    browserFields: {},
  } as unknown as RightPanelContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <HighlightedFields />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};

export const Empty: Story<void> = () => {
  const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
  const panelContextValue = {
    eventId: null,
  } as unknown as RightPanelContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <HighlightedFields />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};
