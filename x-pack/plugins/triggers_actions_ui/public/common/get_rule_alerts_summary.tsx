/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertSummaryWidget } from '../application/sections';
import { AlertSummaryWidgetProps } from '../application/sections/alert_summary_widget';

export const getAlertSummaryWidgetLazy = (props: AlertSummaryWidgetProps) => {
  return <AlertSummaryWidget {...props} />;
};
