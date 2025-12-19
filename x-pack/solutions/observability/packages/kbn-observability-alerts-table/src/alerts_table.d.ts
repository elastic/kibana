/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableProps,
  ObservabilityRuleTypeRegistry,
  ConfigSchema,
} from './types';
export interface ObservabilityAlertsTableComponentProps extends ObservabilityAlertsTableProps {
  observabilityRuleTypeRegistry?: ObservabilityRuleTypeRegistry;
  config?: ConfigSchema;
  renderExpandedAlertView?: GetObservabilityAlertsTableProp<'renderExpandedAlertView'>;
}
export declare function ObservabilityAlertsTable({
  observabilityRuleTypeRegistry,
  config,
  renderExpandedAlertView,
  ...props
}: ObservabilityAlertsTableComponentProps): React.JSX.Element;
export default ObservabilityAlertsTable;
export type ObservabilityAlertsTableType = typeof ObservabilityAlertsTable;
