import type { PackagePolicyVars, SettingsRow } from '../typings';
export declare function getRUMSettings(): SettingsRow[];
export declare function isRUMFormValid(newVars: PackagePolicyVars, rumSettings: SettingsRow[]): boolean;
