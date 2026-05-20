interface Variables {
    [key: string]: string;
}
export interface LineNumbers {
    [key: string]: string | number | object;
}
export declare function getApmAgentCommands({ variantId, policyDetails, defaultValues, }: {
    variantId: string;
    policyDetails: {
        apmServerUrl?: string;
        secretToken?: string;
    };
    defaultValues: {
        apmServiceName: string;
        apmEnvironment: string;
    };
}): string;
export declare function getApmAgentVariables(variantId: string): Variables;
export declare function getApmAgentLineNumbers(variantId: string): LineNumbers;
export declare function getApmAgentHighlightLang(variantId: string): string;
export declare const secretTokenKeys: string[];
export {};
