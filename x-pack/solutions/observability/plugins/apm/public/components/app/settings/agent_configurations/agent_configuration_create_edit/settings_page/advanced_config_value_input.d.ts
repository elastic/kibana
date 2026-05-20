import React from 'react';
export declare function AdvancedConfigValueInput({ configValue, configKey, id, showLabel, revalidate, onChange, onDelete, addValidationError, removeValidationError, }: {
    configValue: string;
    configKey: string;
    id: number;
    showLabel: boolean;
    revalidate: boolean;
    onChange: ({ key, value }: {
        key: string;
        value: string;
    }) => void;
    onDelete: (key: string, index: number) => void;
    addValidationError: (key: string, active: boolean) => void;
    removeValidationError: (key: string) => void;
}): React.JSX.Element;
