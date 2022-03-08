/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { EuiHeader } from '@elastic/eui';

import { DeploymentDetails as ConnectedComponent } from './deployment_details';
import type { Props as PureComponentProps } from './deployment_details.component';
import { DeploymentDetails as PureComponent } from './deployment_details.component';

export default {
  title: 'Sections/EPM/Deployment Details',
  description: '',
  decorators: [
    (storyFn) => {
      const sections = [{ items: [] }, { items: [storyFn()] }];
      return <EuiHeader sections={sections} />;
    },
  ],
} as Meta;

export const DeploymentDetails = () => {
  return <ConnectedComponent />;
};

DeploymentDetails.args = {
  isCloudEnabled: true,
};

DeploymentDetails.argTypes = {
  isCloudEnabled: {
    type: {
      name: 'boolean',
    },
    defaultValue: true,
    control: {
      type: 'boolean',
    },
  },
};

export const Component = (props: PureComponentProps) => {
  return <PureComponent {...props} />;
};

Component.args = {
  cloudId: 'cloud-id',
  learnMoreUrl: 'https://learn-more-url',
  managementUrl: 'https://management-url',
};
