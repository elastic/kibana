/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { InsightsSection } from './insights_section';
import { RightPanelContext } from '../context';

const flyoutContextValue = {
  openLeftPanel: () => window.alert('openLeftPanel'),
} as unknown as ExpandableFlyoutContext;
const panelContextValue = {
  getFieldsData: () => ({
    host: {
      name: 'hostName',
    },
    user: {
      name: 'userName',
    },
  }),
} as unknown as RightPanelContext;

export default {
  component: InsightsSection,
  title: 'Flyout/InsightsSection',
};

export const Expand: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <InsightsSection expanded={true} />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};

export const Collapse: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <InsightsSection />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};
