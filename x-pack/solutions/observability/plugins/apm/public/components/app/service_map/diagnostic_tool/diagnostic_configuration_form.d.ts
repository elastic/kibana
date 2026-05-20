import React from 'react';
import type { DiagnosticFormState } from './types';
interface DiagnosticConfigurationFormProps {
    onSelectionUpdate: ({ field, value, }: {
        field: keyof DiagnosticFormState;
        value?: string;
    }) => void;
    sourceNode?: string;
}
export declare function DiagnosticConfigurationForm({ onSelectionUpdate, sourceNode, }: DiagnosticConfigurationFormProps): React.JSX.Element;
export {};
