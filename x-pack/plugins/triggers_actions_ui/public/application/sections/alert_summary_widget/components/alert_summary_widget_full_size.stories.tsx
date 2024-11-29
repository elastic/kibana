/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME } from '@elastic/charts';
import { action } from '@storybook/addon-actions';
import { AlertSummaryWidgetFullSize as Component } from './alert_summary_widget_full_size';
import { mockedAlertSummaryResponse, mockedChartProps } from '../../../mock/alert_summary_widget';

export default {
  component: Component,
  title: 'app/AlertSummaryWidget',
};

export const FullSize = {
  args: {
    ...mockedAlertSummaryResponse,
    hideChart: false,
    hideStats: false,
    chartProps: {
      ...mockedChartProps,
      onBrushEnd: action('brushEvent'),
    },
    dependencyProps: {
      baseTheme: LIGHT_THEME,
    },
  },
};
