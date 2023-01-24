/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import { SloTimeWindowBadge as Component, Props } from './slo_time_window_badge';
import { createSLO } from '../../../../data/slo/slo';

export default {
  component: Component,
  title: 'app/SLO/ListPage/Badges/SloTimeWindowBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

export const With7DaysRolling = Template.bind({});
With7DaysRolling.args = { slo: createSLO({ timeWindow: { duration: '7d', isRolling: true } }) };

export const With30DaysRolling = Template.bind({});
With30DaysRolling.args = { slo: createSLO({ timeWindow: { duration: '30d', isRolling: true } }) };

export const WithMonthlyCalendarStartingToday = Template.bind({});
WithMonthlyCalendarStartingToday.args = {
  slo: createSLO({
    timeWindow: { duration: '1M', calendar: { startTime: new Date().toISOString() } },
  }),
};

export const WithMonthlyCalendar = Template.bind({});
WithMonthlyCalendar.args = {
  slo: createSLO({
    timeWindow: { duration: '1M', calendar: { startTime: '2022-01-01T00:00:00.000Z' } },
  }),
};

export const WithBiWeeklyCalendar = Template.bind({});
WithBiWeeklyCalendar.args = {
  slo: createSLO({
    timeWindow: { duration: '2w', calendar: { startTime: '2023-01-01T00:00:00.000Z' } },
  }),
};

export const WithQuarterlyCalendar = Template.bind({});
WithQuarterlyCalendar.args = {
  slo: createSLO({
    timeWindow: { duration: '1Q', calendar: { startTime: '2022-01-01T00:00:00.000Z' } },
  }),
};
