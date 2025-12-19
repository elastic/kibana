/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { AlertStatus } from '@kbn/rule-data-utils';
interface AlertStatusIndicatorProps {
  alertStatus: AlertStatus;
  textSize?: 'xs' | 's' | 'm' | 'inherit';
}
export declare function AlertStatusIndicator({
  alertStatus,
  textSize,
}: AlertStatusIndicatorProps): React.JSX.Element;
export {};
