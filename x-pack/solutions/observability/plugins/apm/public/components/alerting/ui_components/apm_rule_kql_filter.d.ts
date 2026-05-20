import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import type { TransactionDurationRuleParams } from '../rule_types/transaction_duration_rule_type';
import type { ErrorRateRuleParams } from '../rule_types/transaction_error_rate_rule_type';
import type { ErrorCountRuleParams } from '../rule_types/error_count_rule_type';
interface Props {
    ruleParams: TransactionDurationRuleParams | ErrorRateRuleParams | ErrorCountRuleParams;
    setRuleParams: (key: string, value: any) => void;
    onToggleKqlFilter: (e: EuiSwitchEvent) => void;
}
export declare function ApmRuleKqlFilter({ ruleParams, setRuleParams, onToggleKqlFilter }: Props): React.JSX.Element;
export {};
