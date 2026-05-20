import React from 'react';
import type { ILicense } from '@kbn/licensing-types';
export declare const LicenseContext: React.Context<ILicense | undefined>;
export declare function LicenseProvider({ children }: {
    children: React.ReactChild;
}): React.JSX.Element;
