/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { EuiFlexGroup } from '@elastic/eui';

import { KibanaReactStorybookDecorator } from '@kbn/observability-plugin/public';
import { SloActiveAlertsBadge as Component, Props } from './slo_active_alerts_badge';

export default {
  component: Component,
  title: 'app/SLO/Badges/SloActiveAlertsBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => (
  <EuiFlexGroup>
    <Component {...props} />
  </EuiFlexGroup>
);

export const Default = Template.bind({});
Default.args = { activeAlerts: 2 };
