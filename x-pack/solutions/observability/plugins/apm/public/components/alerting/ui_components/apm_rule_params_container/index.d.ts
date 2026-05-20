import React from 'react';
import type { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
interface MinimumWindowSize {
    value: number;
    unit: TIME_UNITS;
}
interface Props {
    setRuleParams: (key: string, value: any) => void;
    setRuleProperty: (key: string, value: any) => void;
    defaultParams: Record<string, any>;
    fields: React.ReactNode[];
    groupAlertsBy?: React.ReactNode;
    kqlFilter?: React.ReactNode;
    chartPreview?: React.ReactNode;
    minimumWindowSize?: MinimumWindowSize;
}
export declare function ApmRuleParamsContainer(props: Props): React.JSX.Element;
export {};
