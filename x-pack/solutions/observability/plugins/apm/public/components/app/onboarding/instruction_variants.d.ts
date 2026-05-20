import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
export declare enum INSTRUCTION_VARIANT {
    NODE = "node",
    DJANGO = "django",
    FLASK = "flask",
    RAILS = "rails",
    RACK = "rack",
    GO = "go",
    JAVA = "java",
    DOTNET = "dotnet",
    PHP = "php"
}
export interface Instruction {
    title?: string;
    id: INSTRUCTION_VARIANT;
    instructions: EuiStepProps[];
}
export declare function getDisplayText(id: INSTRUCTION_VARIANT): string;
export interface AgentApiKey {
    apiKey: string | null;
    id?: string;
    error: boolean;
    errorMessage?: string;
}
export type AgentApiDetails = AgentApiKey & {
    displayApiKeySuccessCallout: boolean;
    displayApiKeyErrorCallout: boolean;
    createAgentKey: () => void;
    createApiKeyLoading: boolean;
};
export interface AgentInstructions {
    baseUrl: string;
    apmServerUrl: string;
    apiKeyDetails?: AgentApiDetails;
    secretToken?: string;
    checkAgentStatus: () => void;
    agentStatus?: boolean;
    agentStatusLoading: boolean;
}
