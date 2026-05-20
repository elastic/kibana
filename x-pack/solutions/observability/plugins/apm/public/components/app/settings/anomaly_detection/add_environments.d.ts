import React from 'react';
interface Props {
    currentEnvironments: string[];
    onCreateJobSuccess: () => void;
    onCancel: () => void;
}
export declare function AddEnvironments({ currentEnvironments, onCreateJobSuccess, onCancel }: Props): React.JSX.Element;
export {};
