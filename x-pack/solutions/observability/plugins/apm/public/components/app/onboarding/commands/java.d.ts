export declare const javaVariables: (secretToken?: string) => {
    apmServerUrl: string;
    apiKey?: string | undefined;
    secretToken?: string | undefined;
};
export declare const javaHighlightLang = "java";
export declare const javaLineNumbers: (apiKey?: string | null) => {
    start: number;
    highlight: string;
    annotations: {
        2: string;
        3: string;
        4: string;
        5: string;
    };
};
export declare const java = "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\n-Delastic.apm.service_name=<your-service-name> \\\n{{^secretToken}}\n-Delastic.apm.api_key={{{apiKey}}} \\\n{{/secretToken}}\n{{#secretToken}}\n-Delastic.apm.secret_token={{{secretToken}}} \\\n{{/secretToken}}\n-Delastic.apm.server_url={{{apmServerUrl}}} \\\n-Delastic.apm.environment=<your-environment> \\\n-Delastic.apm.application_packages=org.example \\\n-jar my-service-name.jar";
