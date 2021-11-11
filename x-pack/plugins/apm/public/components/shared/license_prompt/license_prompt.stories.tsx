/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { LicensePrompt } from '.';

type Args = ComponentProps<typeof LicensePrompt>;

export const stories: Meta<Args> = {
  title: 'shared/LicensePrompt',
  component: LicensePrompt,
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <LicensePrompt {...args} />;
};
Example.args = {
  showBetaBadge: false,
  text: 'To create Feature name, you must be subscribed to an Elastic X license or above.',
};
