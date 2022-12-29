/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertStatus } from '@kbn/rule-data-utils';
import { Alert } from '../../../../../hooks/use_load_alert_summary';

export interface AlertsSummaryWidgetUIProps {
  activeAlertCount: number;
  activeAlerts: Alert[];
  recoveredAlertCount: number;
  recoveredAlerts: Alert[];
  timeRangeTitle: JSX.Element | string;
  onClick: (status?: AlertStatus) => void;
}
