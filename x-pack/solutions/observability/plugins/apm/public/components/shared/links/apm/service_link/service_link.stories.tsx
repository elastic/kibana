/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj } from '@storybook/react';
import type { ComponentProps, ComponentType } from 'react';
import React from 'react';
import { ServiceLink } from '.';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';

type Args = ComponentProps<typeof ServiceLink>;

export default {
  title: 'shared/ServiceLink',
  component: ServiceLink,
  decorators: [
    (StoryComponent: ComponentType) => {
      return (
        <MockApmPluginStorybook>
          <StoryComponent />
        </MockApmPluginStorybook>
      );
    },
  ],
};

export const Example: StoryObj<Args> = {
  render: (args) => {
    return <ServiceLink {...args} />;
  },

  args: {
    agentName: 'java',
    query: {
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      serviceGroup: '',
      comparisonEnabled: false,
    },
    serviceName: 'opbeans-java',
  },
};

export const AndroidAgent: StoryObj<Args> = {
  render: (args) => {
    return <ServiceLink {...args} />;
  },

  args: {
    agentName: 'android/java',
    query: {
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      serviceGroup: '',
      comparisonEnabled: false,
    },
    serviceName: 'opbeans-android',
  },
};

export const IOSAgent: StoryObj<Args> = {
  render: (args) => {
    return <ServiceLink {...args} />;
  },

  args: {
    agentName: 'iOS/swift',
    query: {
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      serviceGroup: '',
      comparisonEnabled: false,
    },
    serviceName: 'opbeans-swift',
  },
};
