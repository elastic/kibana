/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { EuiButtonIcon } from '@elastic/eui';
import { FlyoutNavigation } from './flyout_navigation';

const expandDetails = () => window.alert('expand left panel');

export default {
  component: FlyoutNavigation,
  title: 'Flyout/Navigation',
};

const flyoutContextValue = {
  closeLeftPanel: () => window.alert('close left panel'),
  panels: {},
} as unknown as ExpandableFlyoutContextValue;

export const Expand: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const Collapse: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider
      value={
        {
          ...flyoutContextValue,
          panels: { left: {} },
        } as unknown as ExpandableFlyoutContextValue
      }
    >
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
    </ExpandableFlyoutContext.Provider>
  );
};
export const CollapsableWithAction: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <FlyoutNavigation
        flyoutIsExpandable={true}
        expandDetails={expandDetails}
        actions={<EuiButtonIcon iconType="share" />}
      />
    </ExpandableFlyoutContext.Provider>
  );
};

export const NonCollapsableWithAction: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <FlyoutNavigation flyoutIsExpandable={false} actions={<EuiButtonIcon iconType="share" />} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const Empty: Story<void> = () => {
  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <FlyoutNavigation flyoutIsExpandable={false} />
    </ExpandableFlyoutContext.Provider>
  );
};
