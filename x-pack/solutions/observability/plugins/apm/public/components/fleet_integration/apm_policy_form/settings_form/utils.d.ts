import type { PackagePolicyVars, SettingsRow, BasicSettingRow } from '../typings';
export declare const REQUIRED_LABEL: string;
export declare const OPTIONAL_LABEL: string;
export declare function mergeNewVars(oldVars: PackagePolicyVars, key: string, value?: any): PackagePolicyVars;
export declare function isSettingsFormValid(parentSettings: SettingsRow[], vars: PackagePolicyVars): boolean;
export declare function validateSettingValue(setting: BasicSettingRow, value?: any): {
    isValid: boolean;
    message: string;
};
