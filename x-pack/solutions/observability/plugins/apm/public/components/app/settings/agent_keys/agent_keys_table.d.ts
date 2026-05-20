import React from 'react';
import type { ApiKey } from '@kbn/security-plugin-types-common';
interface Props {
    agentKeys: ApiKey[];
    onKeyDelete: () => void;
    canManage: boolean;
}
export declare function AgentKeysTable({ agentKeys, onKeyDelete, canManage }: Props): React.JSX.Element;
export {};
