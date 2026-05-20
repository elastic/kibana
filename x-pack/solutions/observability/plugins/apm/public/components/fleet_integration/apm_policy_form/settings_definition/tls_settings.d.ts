import type { PackagePolicyVars, SettingsRow } from '../typings';
export declare function getTLSSettings(): SettingsRow[];
export declare function isTLSFormValid(newVars: PackagePolicyVars, tlsSettings: SettingsRow[]): boolean;
