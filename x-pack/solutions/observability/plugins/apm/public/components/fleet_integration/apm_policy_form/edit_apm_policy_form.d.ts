import React from 'react';
import type { NewPackagePolicy, PackagePolicy, PackagePolicyEditExtensionComponentProps } from './typings';
interface Props {
    policy: PackagePolicy;
    newPolicy: NewPackagePolicy;
    onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}
export declare function EditAPMPolicyForm({ newPolicy, onChange }: Props): React.JSX.Element;
export {};
