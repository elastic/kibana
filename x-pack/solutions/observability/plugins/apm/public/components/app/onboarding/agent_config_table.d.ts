import React from 'react';
export declare function AgentConfigurationTable({ variables, data, createApiKey, createApiKeyLoading, }: {
    variables: {
        [key: string]: string;
    };
    data: {
        apmServerUrl?: string;
        secretToken?: string;
        apiKey?: string | null;
    };
    createApiKey?: () => void;
    createApiKeyLoading?: boolean;
}): React.JSX.Element | null;
