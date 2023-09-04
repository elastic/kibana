/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { mockGetFieldsData } from '../mocks/mock_context';
import { RiskScore } from './risk_score';
import { RightPanelContext } from '../context';

export default {
  component: RiskScore,
  title: 'Flyout/RiskScore',
};

export const Default: Story<void> = () => {
  const contextValue = {
    getFieldsData: mockGetFieldsData,
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <RiskScore />
    </RightPanelContext.Provider>
  );
};

export const Empty: Story<void> = () => {
  const contextValue = {
    getFieldsData: () => {},
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <RiskScore />
    </RightPanelContext.Provider>
  );
};
