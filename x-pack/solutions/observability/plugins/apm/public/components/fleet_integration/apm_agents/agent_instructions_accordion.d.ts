import React from 'react';
import type { CreateAgentInstructions } from './agent_instructions_mappings';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
interface Props {
    agentName: AgentName;
    title: string;
    variantId: string;
    createAgentInstructions: CreateAgentInstructions;
    apmServerUrl?: string;
    secretToken?: string;
}
export declare function AgentInstructionsAccordion({ agentName, title, createAgentInstructions, variantId, apmServerUrl, secretToken, }: Props): React.JSX.Element;
export {};
