/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { AlertsSummaryWidgetCompact as Component } from './alert_summary_widget_compact';
import { mockAlertSummaryResponse } from '../../../../../mock/alert_summary_widget';

export default {
  component: Component,
  title: 'app/AlertsSummaryWidget',
};

export const Compact = {
  args: {
    ...mockAlertSummaryResponse,
    timeRangeTitle: 'Last 30 days',
    onClick: action('clicked'),
  },
};
