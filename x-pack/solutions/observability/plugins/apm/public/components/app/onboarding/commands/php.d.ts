export declare const phpVariables: (secretToken?: string) => {
    apmServerUrl: string;
    apiKey?: string | undefined;
    secretToken?: string | undefined;
};
export declare const phpHighlightLang = "php";
export declare const phpLineNumbers: () => {
    start: number;
    highlight: string;
};
export declare const php = "# {{serviceNameHint}}\nelastic_apm.service_name=\"<your-service-name>\"\n\n{{^secretToken}}\n# {{apiKeyHint}}\nelastic_apm.api_key=\"{{{apiKey}}}\"\n{{/secretToken}}\n{{#secretToken}}\n# {{secretTokenHint}}\nelastic_apm.secret_token=\"{{{secretToken}}}\"\n{{/secretToken}}\n\n# {{serverUrlHint}}\nelastic_apm.server_url=\"{{{apmServerUrl}}}\"\n\n# {{{serviceEnvironmentHint}}}\nelastic_apm.environment=\"<your-environment>\"";
