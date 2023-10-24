/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { EuiButtonIcon } from '@elastic/eui';
import { FlyoutNavigation } from './flyout_navigation';

const expandDetails = () => window.alert('expand left panel');

export default {
  component: FlyoutNavigation,
  title: 'Flyout/Navigation',
};

export const CollapsableWithAction: Story<void> = () => {
  const flyoutContextValue = {
    closeLeftPanel: () => window.alert('close left panel'),
    panels: {},
  } as unknown as ExpandableFlyoutContext;

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

export const CollapsableWithoutAction: Story<void> = () => {
  const flyoutContextValue = {
    closeLeftPanel: () => window.alert('close left panel'),
    panels: {},
  } as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const NonCollapsableWithAction: Story<void> = () => {
  const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <FlyoutNavigation flyoutIsExpandable={false} actions={<EuiButtonIcon iconType="share" />} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const Empty: Story<void> = () => {
  const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <FlyoutNavigation flyoutIsExpandable={false} />
    </ExpandableFlyoutContext.Provider>
  );
};
