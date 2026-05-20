import React from 'react';
import type { PackagePolicyVars, SettingsRow } from '../typings';
export type FormRowOnChange = (key: string, value: any) => void;
export interface SettingsSection {
    id: string;
    title: string;
    subtitle?: string;
    settings: SettingsRow[];
    isPlatinumLicence?: boolean;
}
interface Props {
    settingsSection: SettingsSection;
    vars?: PackagePolicyVars;
    onChange: FormRowOnChange;
}
export declare function SettingsForm({ settingsSection, vars, onChange }: Props): React.JSX.Element;
export {};
