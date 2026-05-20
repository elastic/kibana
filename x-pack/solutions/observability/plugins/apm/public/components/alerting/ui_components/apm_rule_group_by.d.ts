import React from 'react';
interface Props {
    options: {
        groupBy: string[] | undefined;
    };
    fields: string[];
    preSelectedOptions: string[];
    onChange: (groupBy: string[] | null) => void;
    errorOptions?: string[];
}
export declare function APMRuleGroupBy({ options, fields, preSelectedOptions, onChange, errorOptions, }: Props): React.JSX.Element;
export {};
