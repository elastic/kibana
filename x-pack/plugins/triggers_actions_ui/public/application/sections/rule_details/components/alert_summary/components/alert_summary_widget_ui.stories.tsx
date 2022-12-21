/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { AlertsSummaryWidgetUI as Component } from './alert_summary_widget_ui';

export default {
  component: Component,
  title: 'app/AlertsSummaryWidgetUI',
};

export const Overview = {
  args: {
    active: 15,
    recovered: 53,
    timeRangeTitle: 'Last 30 days',
    onClick: action('clicked'),
  },
};
