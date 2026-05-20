import React from 'react';
import type { SearchConfigurationType } from '@kbn/response-ops-rule-params/common';
import { AggregationType } from '../../../../../common/rules/apm_rule_types';
import type { AlertMetadata } from '../../utils/helper';
export interface TransactionDurationRuleParams {
    aggregationType: AggregationType;
    environment: string;
    threshold: number;
    transactionType?: string;
    transactionName?: string;
    serviceName?: string;
    windowSize: number;
    windowUnit: string;
    groupBy?: string[] | undefined;
    useKqlFilter?: boolean;
    searchConfiguration?: SearchConfigurationType;
}
interface Props {
    ruleParams: TransactionDurationRuleParams;
    metadata?: AlertMetadata;
    setRuleParams: (key: string, value: any) => void;
    setRuleProperty: (key: string, value: any) => void;
}
export declare function TransactionDurationRuleType(props: Props): React.JSX.Element;
export default TransactionDurationRuleType;
