import type { PackagePolicyVars, SettingsRow } from '../typings';
export declare const TAIL_SAMPLING_ENABLED_KEY = "tail_sampling_enabled";
export declare function getTailSamplingSettings(docsLinks?: string): SettingsRow[];
export declare function isTailBasedSamplingValid(newVars: PackagePolicyVars, tailSamplingSettings: SettingsRow[]): boolean;
