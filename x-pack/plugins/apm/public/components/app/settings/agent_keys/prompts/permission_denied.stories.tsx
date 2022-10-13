/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Story } from '@storybook/react';
import React from 'react';
import { PermissionDenied } from './permission_denied';

const stories = {
  title: 'app/Settings/AgentKeys/prompts/PermissionDenied',
  component: PermissionDenied,
};
export default stories;

export const Example: Story = (args) => {
  return <PermissionDenied {...args} />;
};
