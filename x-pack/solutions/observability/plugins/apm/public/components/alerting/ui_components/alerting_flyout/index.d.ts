import React from 'react';
import type { ApmRuleType } from '@kbn/rule-data-utils';
interface Props {
    addFlyoutVisible: boolean;
    setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
    ruleType: ApmRuleType | null;
    serviceName?: string;
    transactionName?: string;
}
export declare function AlertingFlyout(props: Props): React.JSX.Element;
export {};
