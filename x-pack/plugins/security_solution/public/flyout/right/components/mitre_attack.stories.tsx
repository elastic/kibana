/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { mockSearchHit } from '../mocks/mock_context';
import { RightPanelContext } from '../context';
import { MitreAttack } from './mitre_attack';

export default {
  component: MitreAttack,
  title: 'Flyout/MitreAttack',
};

export const Default: Story<void> = () => {
  const contextValue = { searchHit: mockSearchHit } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <MitreAttack />
    </RightPanelContext.Provider>
  );
};

export const Empty: Story<void> = () => {
  const contextValue = {
    searchHit: {
      some_field: 'some_value',
    },
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <MitreAttack />
    </RightPanelContext.Provider>
  );
};
