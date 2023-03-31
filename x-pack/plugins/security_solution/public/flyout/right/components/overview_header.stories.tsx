/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiSpacer } from '@elastic/eui';
import { OverviewHeader } from './overview_header';

export default {
  component: OverviewHeader,
  title: 'Flyout/OverviewHeader',
};

const defaultProps = {
  title: 'Default title',
};

const testChildren = <p>{'test content'}</p>;

export const Default: Story<void> = () => {
  return <OverviewHeader {...defaultProps}>{testChildren}</OverviewHeader>;
};

export const DefaultExpanded: Story<void> = () => {
  return (
    <OverviewHeader {...defaultProps} expanded={true}>
      {testChildren}
    </OverviewHeader>
  );
};

export const NoChildren: Story<void> = () => {
  return (
    <>
      <OverviewHeader title={'No children'} />
      <EuiSpacer size="m" />
      <OverviewHeader title={'Children is null'}>{null}</OverviewHeader>
    </>
  );
};
export const Disabled: Story<void> = () => {
  return (
    <>
      <OverviewHeader {...defaultProps} disabled={true}>
        {testChildren}
      </OverviewHeader>
    </>
  );
};
