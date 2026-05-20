import React from 'react';
import type { AnomalyAlertSeverityType } from '../../../../../common/rules/apm_rule_types';
export declare function AnomalySeverity({ type }: {
    type: AnomalyAlertSeverityType;
}): React.JSX.Element;
interface Props {
    onChange: (value: AnomalyAlertSeverityType) => void;
    value: AnomalyAlertSeverityType;
}
export declare function SelectAnomalySeverity({ onChange, value }: Props): React.JSX.Element;
export {};
