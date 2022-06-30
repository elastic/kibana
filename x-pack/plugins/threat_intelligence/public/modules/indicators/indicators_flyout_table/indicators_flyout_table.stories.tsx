/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { generateMockIndicator, Indicator } from '../../../../common/types/Indicator';
import { IndicatorsFlyoutTable } from './indicators_flyout_table';

export default {
  component: IndicatorsFlyoutTable,
  title: 'IndicatorsFlyoutTable',
};

const mockIndicator: Indicator = generateMockIndicator();

export const Default: Story<void> = () => {
  return <IndicatorsFlyoutTable indicator={mockIndicator} />;
};

export const EmptyIndicator: Story<void> = () => {
  return <IndicatorsFlyoutTable indicator={{} as unknown as Indicator} />;
};
