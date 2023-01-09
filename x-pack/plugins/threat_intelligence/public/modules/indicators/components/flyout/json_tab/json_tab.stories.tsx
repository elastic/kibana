/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { generateMockIndicator, Indicator } from '../../../../../../common/types/indicator';
import { IndicatorsFlyoutJson } from '.';

export default {
  component: IndicatorsFlyoutJson,
  title: 'IndicatorsFlyoutJson',
};

export const Default: Story<void> = () => {
  const mockIndicator: Indicator = generateMockIndicator();

  return <IndicatorsFlyoutJson indicator={mockIndicator} />;
};

export const EmptyIndicator: Story<void> = () => {
  return <IndicatorsFlyoutJson indicator={{} as unknown as Indicator} />;
};
