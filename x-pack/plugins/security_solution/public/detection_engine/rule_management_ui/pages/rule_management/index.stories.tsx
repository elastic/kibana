/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';

import { RulesPage } from './index';
import mdx from './README.mdx';

const meta: Meta<typeof RulesPage> = {
  title: 'Rule Mgmt/Page',
  component: RulesPage,
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export default meta;
type Story = StoryObj<typeof RulesPage>;

export const Simple: Story = {
  args: {},
};
