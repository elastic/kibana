import React from 'react';
interface Props {
    onConfirm: () => void;
    onCancel: () => void;
    unsupportedConfigs: Array<{
        key: string;
        value: string;
    }>;
}
export declare function ConfirmSwitchModal({ onConfirm, onCancel, unsupportedConfigs }: Props): React.JSX.Element;
export {};
