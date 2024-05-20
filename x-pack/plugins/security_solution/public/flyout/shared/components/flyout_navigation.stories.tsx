/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiButtonIcon } from '@elastic/eui';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { FlyoutNavigation } from './flyout_navigation';

const expandDetails = () => window.alert('expand left panel');

export default {
  component: FlyoutNavigation,
  title: 'Flyout/Navigation',
};

export const Expand: Story<void> = () => {
  return (
    <TestProvider>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
    </TestProvider>
  );
};

export const Collapse: Story<void> = () => {
  return (
    <TestProvider>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
    </TestProvider>
  );
};
export const CollapsableWithAction: Story<void> = () => {
  return (
    <TestProvider>
      <FlyoutNavigation
        flyoutIsExpandable={true}
        expandDetails={expandDetails}
        actions={<EuiButtonIcon iconType="share" />}
      />
    </TestProvider>
  );
};

export const NonCollapsableWithAction: Story<void> = () => {
  return (
    <TestProvider>
      <FlyoutNavigation flyoutIsExpandable={false} actions={<EuiButtonIcon iconType="share" />} />
    </TestProvider>
  );
};

export const Empty: Story<void> = () => {
  return (
    <TestProvider>
      <FlyoutNavigation flyoutIsExpandable={false} />
    </TestProvider>
  );
};
