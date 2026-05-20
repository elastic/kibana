import React from 'react';
import type { PackagePolicyVars } from './typings';
interface Props {
    updateAPMPolicy: (newVars: PackagePolicyVars, isValid: boolean) => void;
    vars?: PackagePolicyVars;
}
export declare function APMPolicyForm({ vars, updateAPMPolicy }: Props): React.JSX.Element;
export {};
