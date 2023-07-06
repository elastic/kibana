/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { InsightsSubSection } from './insights_subsection';

export default {
  component: InsightsSubSection,
  title: 'Flyout/InsightsSubSection',
};

const title = 'Title';
const children = <div>{'hello'}</div>;

export const Basic: Story<void> = () => {
  return <InsightsSubSection title={title}>{children}</InsightsSubSection>;
};

export const Loading: Story<void> = () => {
  return (
    <InsightsSubSection loading={true} title={title}>
      {null}
    </InsightsSubSection>
  );
};

export const NoTitle: Story<void> = () => {
  return <InsightsSubSection title={''}>{children}</InsightsSubSection>;
};

export const NoChildren: Story<void> = () => {
  return <InsightsSubSection title={title}>{null}</InsightsSubSection>;
};
