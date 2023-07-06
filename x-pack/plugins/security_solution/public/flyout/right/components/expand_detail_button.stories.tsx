/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { ExpandDetailButton } from './expand_detail_button';
import { RightPanelContext } from '../context';

export default {
  component: ExpandDetailButton,
  title: 'Flyout/ExpandDetailButton',
};

export const Expand: Story<void> = () => {
  const flyoutContextValue = {
    openLeftPanel: () => window.alert('openLeftPanel called'),
    panels: {},
  } as unknown as ExpandableFlyoutContext;
  const panelContextValue = {
    eventId: 'eventId',
    indexName: 'indexName',
  } as unknown as RightPanelContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <ExpandDetailButton />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};

export const Collapse: Story<void> = () => {
  const flyoutContextValue = {
    closeLeftPanel: () => window.alert('closeLeftPanel called'),
    panels: {
      left: {},
    },
  } as unknown as ExpandableFlyoutContext;
  const panelContextValue = {} as unknown as RightPanelContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <ExpandDetailButton />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};
