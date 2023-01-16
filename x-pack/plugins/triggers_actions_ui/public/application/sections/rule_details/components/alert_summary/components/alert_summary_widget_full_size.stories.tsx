/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsSummaryWidgetFullSize as Component } from './alert_summary_widget_full_size';
import { mockAlertSummaryResponse } from '../../../../../mock/alert_summary_widget';

export default {
  component: Component,
  title: 'app/AlertsSummaryWidget',
};

export const FullSize = {
  args: {
    ...mockAlertSummaryResponse,
  },
};
