/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { TLPBadge, TLPBadgeProps } from './tlp_badge';

export default {
  component: TLPBadge,
  title: 'TLPBadge',
};

const Template: ComponentStory<typeof TLPBadge> = (args: TLPBadgeProps) => <TLPBadge {...args} />;

export const Red = Template.bind({});
Red.args = {
  value: 'RED',
};

export const Amber = Template.bind({});
Amber.args = {
  value: 'AMBER',
};

export const AmberStrict = Template.bind({});
AmberStrict.args = {
  value: 'AMBER+STRICT',
};

export const Green = Template.bind({});
Green.args = {
  value: 'GREEN',
};

export const White = Template.bind({});
White.args = {
  value: 'WHITE',
};

export const Clear = Template.bind({});
Clear.args = {
  value: 'CLEAR',
};

export const Empty = Template.bind({});
Empty.args = {
  value: undefined,
};

export const Other = Template.bind({});
Other.args = {
  value: 'other',
};
