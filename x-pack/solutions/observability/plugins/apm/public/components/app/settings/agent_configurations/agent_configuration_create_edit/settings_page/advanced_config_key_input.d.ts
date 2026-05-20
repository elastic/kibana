import React from 'react';
export declare function AdvancedConfigKeyInput({ configKey, id, showLabel, revalidate, onChange, checkIfAdvancedConfigKeyExists, checkIfPredefinedConfigKeyExists, addValidationError, removeValidationError, }: {
    configKey: string;
    id: number;
    showLabel: boolean;
    revalidate: boolean;
    onChange: ({ key, oldKey }: {
        key: string;
        oldKey: string;
    }) => void;
    checkIfAdvancedConfigKeyExists: (key: string) => boolean;
    checkIfPredefinedConfigKeyExists: (key: string) => boolean;
    addValidationError: (key: string, active: boolean) => void;
    removeValidationError: (key: string) => void;
}): React.JSX.Element;
