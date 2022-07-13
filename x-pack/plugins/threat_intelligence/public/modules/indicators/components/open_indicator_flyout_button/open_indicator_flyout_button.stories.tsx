/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { generateMockIndicator, Indicator } from '../../../../../common/types/Indicator';
import { OpenIndicatorFlyoutButton } from './open_indicator_flyout_button';

export default {
  component: OpenIndicatorFlyoutButton,
  title: 'ViewDetailsButton',
};

const mockIndicator: Indicator = generateMockIndicator();

export const Default: Story<void> = () => {
  return <OpenIndicatorFlyoutButton indicator={mockIndicator} />;
};
