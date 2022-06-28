/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { Indicator } from '../indicators_flyout/indicators_flyout';
import { IndicatorsFlyoutTable } from './indicators_flyout_table';

export default {
  component: IndicatorsFlyoutTable,
  title: 'IndicatorsFlyoutTable',
};

const mockIndicator: Indicator = {
  id: '12.68.554.87',
  name: 'first indicator',
  last_seen: '2022-06-03T11:41:06.000Z',
  first_seen: '2022-06-03T11:41:06.000Z',
};

export const Default: Story<void> = () => {
  return <IndicatorsFlyoutTable indicator={mockIndicator} />;
};

export const EmptyIndicator: Story<void> = () => {
  return <IndicatorsFlyoutTable indicator={{} as unknown as Indicator} />;
};
