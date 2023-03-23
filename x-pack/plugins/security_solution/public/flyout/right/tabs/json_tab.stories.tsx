/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { RightPanelContext } from '../context';
import { JsonTab } from './json_tab';

export default {
  component: JsonTab,
  title: 'Flyout/JsonTab',
};

export const Default: Story<void> = () => {
  const contextValue = {
    searchHit: {
      some_field: 'some_value',
    },
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <JsonTab />
    </RightPanelContext.Provider>
  );
};

export const Error: Story<void> = () => {
  const contextValue = {
    searchHit: null,
  } as unknown as RightPanelContext;

  return (
    <RightPanelContext.Provider value={contextValue}>
      <JsonTab />
    </RightPanelContext.Provider>
  );
};
