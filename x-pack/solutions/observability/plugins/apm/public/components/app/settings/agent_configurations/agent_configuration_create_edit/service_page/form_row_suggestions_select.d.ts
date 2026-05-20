import type { ReactNode } from 'react';
import React from 'react';
interface Props {
    title: string;
    fieldName: string;
    description: string;
    fieldLabel: string;
    value?: string;
    allowAll?: boolean;
    onChange: (value?: string) => void;
    dataTestSubj?: string;
    isInvalid?: boolean;
    error?: ReactNode | ReactNode[];
}
export declare function FormRowSuggestionsSelect({ title, fieldName, description, fieldLabel, value, allowAll, onChange, dataTestSubj, isInvalid, error, }: Props): React.JSX.Element;
export {};
