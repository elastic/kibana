/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { InvestigationSection } from './investigation_section';
import { mockDataFormattedForFieldBrowser, mockSearchHit } from '../mocks/mock_context';
import { RightPanelContext } from '../context';

const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
const panelContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  searchHit: mockSearchHit,
} as unknown as RightPanelContext;

export default {
  component: InvestigationSection,
  title: 'Flyout/InvestigationSection',
};

export const Expand: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <InvestigationSection expanded={true} />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};

export const Collapse: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <InvestigationSection />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );
};
