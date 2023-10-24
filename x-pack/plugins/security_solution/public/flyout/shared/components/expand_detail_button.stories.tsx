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

export default {
  component: ExpandDetailButton,
  title: 'Flyout/ExpandDetailButton',
};

const expandDetails = () => window.alert('expand left panel');

export const Expand: Story<void> = () => {
  const flyoutContextValue = {
    panels: {},
  } as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <ExpandDetailButton expandDetails={expandDetails} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const Collapse: Story<void> = () => {
  const flyoutContextValue = {
    closeLeftPanel: () => window.alert('close left panel'),
    panels: {
      left: {},
    },
  } as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <ExpandDetailButton expandDetails={expandDetails} />
    </ExpandableFlyoutContext.Provider>
  );
};
