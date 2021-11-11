/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { ServiceLink } from './service_link';

type Args = ComponentProps<typeof ServiceLink>;

const stories: Meta<Args> = {
  title: 'shared/ServiceLink',
  component: ServiceLink,
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <ServiceLink {...args} />;
};
Example.args = {
  agentName: 'java',
  query: {
    environment: 'ENVIRONMENT_ALL',
    kuery: '',
    rangeFrom: 'now-15m',
    rangeTo: 'now',
  },
  serviceName: 'opbeans-java',
};
