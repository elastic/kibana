import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React from 'react';
interface SuggestionsSelectProps {
    customOptions?: Array<EuiComboBoxOptionOption<string>>;
    customOptionText?: string;
    defaultValue?: string;
    fieldName: string;
    start: string;
    end: string;
    onChange: (value?: string) => void;
    isClearable?: boolean;
    isInvalid?: boolean;
    placeholder: string;
    dataTestSubj?: string;
    prepend?: string;
    serviceName?: string;
    shouldReset?: boolean;
    compressed?: boolean;
}
export type { SuggestionsSelectProps };
export declare function SuggestionsSelect({ customOptions, customOptionText, defaultValue, fieldName, start, end, onChange, placeholder, isInvalid, dataTestSubj, isClearable, prepend, serviceName, shouldReset, compressed, }: SuggestionsSelectProps): React.JSX.Element;
