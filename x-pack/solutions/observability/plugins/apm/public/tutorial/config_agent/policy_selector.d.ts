import React from 'react';
import type { PolicyOption } from './get_policy_options';
interface Props {
    options: PolicyOption[];
    selectedOption?: PolicyOption;
    onChange: (selectedOption?: PolicyOption) => void;
    fleetLink?: {
        label: string;
        href: string;
    };
}
export declare function PolicySelector({ options, selectedOption, onChange, fleetLink }: Props): React.JSX.Element;
export {};
