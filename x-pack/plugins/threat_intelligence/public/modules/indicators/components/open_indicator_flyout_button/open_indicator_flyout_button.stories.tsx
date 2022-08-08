/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { OpenIndicatorFlyoutButton } from './open_indicator_flyout_button';

export default {
  component: OpenIndicatorFlyoutButton,
  title: 'OpenIndicatorFlyoutButton',
  argTypes: {
    onOpen: { action: 'onOpen' },
  },
};

const mockIndicator: Indicator = generateMockIndicator();

const Template: ComponentStory<typeof OpenIndicatorFlyoutButton> = (args) => {
  return <OpenIndicatorFlyoutButton {...args} />;
};

export const Default = Template.bind({});

Default.args = {
  indicator: mockIndicator,
  isOpen: false,
};
