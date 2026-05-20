import type { ConfigSchema } from '../../..';
import type { AgentApiKey } from './instruction_variants';
import type { INSTRUCTION_VARIANT } from './instruction_variants';
export declare function serverlessInstructions({ baseUrl, config, checkAgentStatus, agentStatus, agentStatusLoading, }: {
    baseUrl: string;
    config: ConfigSchema;
    checkAgentStatus: () => void;
    agentStatus?: boolean;
    agentStatusLoading: boolean;
}, apiKeyLoading: boolean, apiKeyDetails: AgentApiKey, createAgentKey: () => void): {
    title: string;
    id: INSTRUCTION_VARIANT;
    instructions: import("@elastic/eui/src/components/steps/step").EuiStepProps[];
}[];
