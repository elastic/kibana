import React from 'react';
import type { GetObservabilityAlertsTableProp, ObservabilityAlertsTableProps, ObservabilityRuleTypeRegistry, ConfigSchema } from './types';
export interface ObservabilityAlertsTableComponentProps extends ObservabilityAlertsTableProps {
    observabilityRuleTypeRegistry?: ObservabilityRuleTypeRegistry;
    config?: ConfigSchema;
    renderExpandedAlertView?: GetObservabilityAlertsTableProp<'renderExpandedAlertView'>;
}
export declare function ObservabilityAlertsTable({ observabilityRuleTypeRegistry, config, renderExpandedAlertView, ...props }: ObservabilityAlertsTableComponentProps): React.JSX.Element;
export default ObservabilityAlertsTable;
export type ObservabilityAlertsTableType = typeof ObservabilityAlertsTable;
