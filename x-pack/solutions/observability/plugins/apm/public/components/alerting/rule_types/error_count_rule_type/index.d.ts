import React from 'react';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import type { SearchConfigurationType } from '../../../../../common/rules/schema';
import type { AlertMetadata } from '../../utils/helper';
export interface ErrorCountRuleParams {
    windowSize?: number;
    windowUnit?: TIME_UNITS;
    threshold?: number;
    serviceName?: string;
    environment?: string;
    groupBy?: string[] | undefined;
    errorGroupingKey?: string;
    useKqlFilter?: boolean;
    searchConfiguration?: SearchConfigurationType;
}
interface Props {
    ruleParams: ErrorCountRuleParams;
    metadata?: AlertMetadata;
    setRuleParams: (key: string, value: any) => void;
    setRuleProperty: (key: string, value: any) => void;
}
export declare function ErrorCountRuleType(props: Props): React.JSX.Element;
export default ErrorCountRuleType;
