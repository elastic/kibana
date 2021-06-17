/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import React from 'react';

import {
  reduxDecorator,
  getAddonPanelParameters,
  servicesContextDecorator,
} from '../../../../storybook';
import { getSomeTemplates } from '../../../services/stubs/workpad';

import { WorkpadTemplates } from './workpad_templates';
import { WorkpadTemplates as WorkpadTemplatesComponent } from './workpad_templates.component';

export default {
  title: 'Home/Workpad Templates',
  argTypes: {},
  decorators: [reduxDecorator()],
  parameters: [getAddonPanelParameters()],
};

export const NoTemplates = () => {
  return (
    <EuiPanel>
      <WorkpadTemplates />
    </EuiPanel>
  );
};

export const HasTemplates = () => {
  return (
    <EuiPanel>
      <WorkpadTemplates />
    </EuiPanel>
  );
};

NoTemplates.decorators = [servicesContextDecorator()];
HasTemplates.decorators = [servicesContextDecorator({ findTemplates: true })];

export const Component = ({ hasTemplates }: { hasTemplates: boolean }) => {
  return (
    <EuiPanel>
      <WorkpadTemplatesComponent
        onCreateWorkpad={action('onCreateWorkpad')}
        templates={hasTemplates ? getSomeTemplates().templates : []}
      />
    </EuiPanel>
  );
};

Component.args = {
  hasTemplates: true,
};
