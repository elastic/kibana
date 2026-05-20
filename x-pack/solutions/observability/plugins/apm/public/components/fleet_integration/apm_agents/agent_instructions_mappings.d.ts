import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
export type CreateAgentInstructions = (apmServerUrl?: string, secretToken?: string) => Array<{
    title: string;
    textPre?: string;
    commands?: string[];
    textPost?: string;
    customComponentName?: string;
}>;
export declare const ApmAgentInstructionsMappings: Array<{
    agentName: AgentName;
    title: string;
    variantId: string;
    createAgentInstructions: CreateAgentInstructions;
}>;
