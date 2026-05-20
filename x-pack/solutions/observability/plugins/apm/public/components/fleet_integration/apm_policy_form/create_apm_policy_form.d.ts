import React from 'react';
import type { NewPackagePolicy, PackagePolicyCreateExtensionComponentProps } from './typings';
interface Props {
    newPolicy: NewPackagePolicy;
    onChange: PackagePolicyCreateExtensionComponentProps['onChange'];
}
export declare function CreateAPMPolicyForm({ newPolicy, onChange }: Props): React.JSX.Element;
export {};
