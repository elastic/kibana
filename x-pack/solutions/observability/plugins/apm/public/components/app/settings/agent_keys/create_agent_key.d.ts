import React from 'react';
import type { CreateApiKeyResponse } from '../../../../../common/agent_key_types';
interface Props {
    onCancel: () => void;
    onSuccess: (agentKey: CreateApiKeyResponse) => void;
    onError: (keyName: string, message: string) => void;
}
export declare function CreateAgentKeyFlyout({ onCancel, onSuccess, onError }: Props): React.JSX.Element;
export {};
