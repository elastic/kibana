import type { LineNumbers } from '../../../../tutorial/config_agent/commands/get_apm_agent_commands';
interface Variables {
    [key: string]: string;
}
export declare function getApmAgentCommands({ variantId, apmServerUrl, secretToken, apiKey, }: {
    variantId: string;
    apmServerUrl?: string;
    secretToken?: string;
    apiKey?: string | null;
}): string;
export declare function getApmAgentVariables(variantId: string, secretToken?: string): Variables;
export declare function getApmAgentLineNumbers(variantId: string, apiKey?: string | null): LineNumbers;
export declare function getApmAgentHighlightLang(variantId: string): string;
export {};
