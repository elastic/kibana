import React from 'react';
import type { FormRowOnChange } from '.';
import type { SettingsRow } from '../typings';
interface Props {
    row: SettingsRow;
    value?: any;
    onChange: FormRowOnChange;
    isDisabled?: boolean;
}
export declare function FormRowSetting({ row, value, onChange, isDisabled }: Props): React.JSX.Element;
export {};
