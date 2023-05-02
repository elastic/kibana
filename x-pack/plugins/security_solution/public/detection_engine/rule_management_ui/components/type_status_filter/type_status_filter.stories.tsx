/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';

import type { TypeStatusFilterPopoverProps } from './type_status_filter';
import { TypeStatusFilterPopover } from './type_status_filter';

export default {
  title: 'Rule Mgmt/Rules Table/TypeStatusFilterPopover',
  component: TypeStatusFilterPopover,
  argTypes: {
    clearItems: { action: 'clearItems' },
  },
};

export const DefaultState: Story<TypeStatusFilterPopoverProps> = (args) => (
  <TypeStatusFilterPopover {...args} />
);
DefaultState.args = {};

export const AllItemsSelected = DefaultState.bind({});
AllItemsSelected.args = {};
