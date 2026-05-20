import React from 'react';
import type { SearchConfigurationType } from '@kbn/response-ops-rule-params/common';
import type { AlertMetadata } from '../../utils/helper';
export interface ErrorRateRuleParams {
    windowSize?: number;
    windowUnit?: string;
    threshold?: number;
    serviceName?: string;
    transactionType?: string;
    transactionName?: string;
    environment?: string;
    groupBy?: string[] | undefined;
    useKqlFilter?: boolean;
    searchConfiguration?: SearchConfigurationType;
}
export interface Props {
    ruleParams: ErrorRateRuleParams;
    metadata?: AlertMetadata;
    setRuleParams: (key: string, value: any) => void;
    setRuleProperty: (key: string, value: any) => void;
}
export declare function TransactionErrorRateRuleType(props: Props): React.JSX.Element;
export default TransactionErrorRateRuleType;
