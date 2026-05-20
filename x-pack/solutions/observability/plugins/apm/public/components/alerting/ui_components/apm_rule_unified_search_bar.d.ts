import React from 'react';
import type { TransactionDurationRuleParams } from '../rule_types/transaction_duration_rule_type';
import type { ErrorRateRuleParams } from '../rule_types/transaction_error_rate_rule_type';
import type { ErrorCountRuleParams } from '../rule_types/error_count_rule_type';
export declare function ApmRuleUnifiedSearchBar({ placeholder, ruleParams, setRuleParams, }: {
    placeholder?: string;
    value?: string;
    isClearable?: boolean;
    ruleParams: TransactionDurationRuleParams | ErrorRateRuleParams | ErrorCountRuleParams;
    setRuleParams: (key: string, value: any) => void;
}): React.JSX.Element;
