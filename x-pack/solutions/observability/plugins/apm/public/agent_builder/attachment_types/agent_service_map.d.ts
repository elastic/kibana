import React from 'react';
import '@xyflow/react/dist/style.css';
import type { ServiceMapAttachmentData } from '../../../common/agent_builder/attachments';
export interface AgentServiceMapProps {
    connections: ServiceMapAttachmentData['connections'];
}
export declare function formatEdgeLabel(metrics: ServiceMapAttachmentData['connections'][0]['metrics']): string | undefined;
export declare function AgentServiceMap({ connections }: AgentServiceMapProps): React.JSX.Element;
