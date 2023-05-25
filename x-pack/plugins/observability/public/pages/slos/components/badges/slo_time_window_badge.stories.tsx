/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { EuiFlexGroup } from '@elastic/eui';
import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import { SloTimeWindowBadge as Component, Props } from './slo_time_window_badge';
import { buildSlo } from '../../../../data/slo/slo';

export default {
  component: Component,
  title: 'app/SLO/Badges/SloTimeWindowBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => (
  <EuiFlexGroup>
    <Component {...props} />
  </EuiFlexGroup>
);

export const With7DaysRolling = Template.bind({});
With7DaysRolling.args = { slo: buildSlo({ timeWindow: { duration: '7d', isRolling: true } }) };

export const With30DaysRolling = Template.bind({});
With30DaysRolling.args = { slo: buildSlo({ timeWindow: { duration: '30d', isRolling: true } }) };

export const WithWeeklyCalendar = Template.bind({});
WithWeeklyCalendar.args = {
  slo: buildSlo({
    timeWindow: { duration: '1w', isCalendar: true },
  }),
};

export const WithMonthlyCalendar = Template.bind({});
WithMonthlyCalendar.args = {
  slo: buildSlo({
    timeWindow: { duration: '1M', isCalendar: true },
  }),
};
