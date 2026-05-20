import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React from 'react';
interface Props {
    title: string;
    description: string;
    fieldLabel: string;
    isLoading: boolean;
    options?: Array<EuiComboBoxOptionOption<string>>;
    isDisabled: boolean;
    value?: string;
    onChange: (value?: string) => void;
    dataTestSubj?: string;
}
export declare function FormRowSelect({ title, description, fieldLabel, isLoading, options, isDisabled, onChange, value, dataTestSubj, }: Props): React.JSX.Element;
export {};
