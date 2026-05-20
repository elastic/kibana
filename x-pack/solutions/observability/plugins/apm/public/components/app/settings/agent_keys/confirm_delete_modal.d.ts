import React from 'react';
import type { ApiKey } from '@kbn/security-plugin-types-common';
interface Props {
    agentKey: ApiKey;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function ConfirmDeleteModal({ agentKey, onCancel, onConfirm }: Props): React.JSX.Element;
export {};
