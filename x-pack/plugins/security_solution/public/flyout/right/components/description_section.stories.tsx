/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { mockDataFormattedForFieldBrowser, mockSearchHit } from '../mocks/mock_context';
import { RightPanelContext } from '../context';
import { DescriptionSection } from './description_section';

const panelContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  searchHit: mockSearchHit,
} as unknown as RightPanelContext;

export default {
  component: DescriptionSection,
  title: 'Flyout/DescriptionSection',
};

export const Expand: Story<void> = () => {
  return (
    <RightPanelContext.Provider value={panelContextValue}>
      <DescriptionSection />
    </RightPanelContext.Provider>
  );
};

export const Collapse: Story<void> = () => {
  return (
    <RightPanelContext.Provider value={panelContextValue}>
      <DescriptionSection expanded={false} />
    </RightPanelContext.Provider>
  );
};
