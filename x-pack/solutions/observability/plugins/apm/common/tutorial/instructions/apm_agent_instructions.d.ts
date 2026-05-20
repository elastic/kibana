export declare const createNodeAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands: string[];
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
    commands?: undefined;
})[];
export declare const createDjangoAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands: string[];
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
    commands?: undefined;
})[];
export declare const createFlaskAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands: string[];
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
    commands?: undefined;
})[];
export declare const createRailsAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands: string[];
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
    commands?: undefined;
})[];
export declare const createRackAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands: string[];
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
    commands?: undefined;
})[];
export declare const createJsAgentInstructions: (apmServerUrl?: string) => ({
    title: string;
    textPre: string;
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost?: undefined;
})[];
export declare const createGoAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands: string[];
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
    commands?: undefined;
} | {
    title: string;
    textPre: string;
    commands: string[];
    textPost: string;
    customComponentName?: undefined;
})[];
export declare const createJavaAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
})[];
export declare const createDotNetAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands?: undefined;
    textPost?: undefined;
    customComponentName?: undefined;
} | {
    title: string;
    textPre: string;
    commands: string[];
    textPost: string;
    customComponentName?: undefined;
} | {
    title: string;
    customComponentName: string;
    textPost: string;
    textPre?: undefined;
    commands?: undefined;
})[];
export declare const createPhpAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    commands?: undefined;
    textPost?: undefined;
    customComponentName?: undefined;
} | {
    title: string;
    textPre: string;
    commands: string[];
    textPost: string;
    customComponentName?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
    commands?: undefined;
})[];
export declare const createOpenTelemetryAgentInstructions: (apmServerUrl?: string, secretToken?: string) => ({
    title: string;
    textPre: string;
    customComponentName?: undefined;
    textPost?: undefined;
} | {
    title: string;
    textPre: string;
    customComponentName: string;
    textPost: string;
})[];
