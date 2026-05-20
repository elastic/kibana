import React from 'react';
export declare function AgentConfigInstructions({ variantId, apmServerUrl, secretToken, apiKey, createApiKey, createApiKeyLoading, }: {
    variantId: string;
    apmServerUrl: string;
    secretToken?: string;
    apiKey?: string | null;
    createApiKey?: () => void;
    createApiKeyLoading?: boolean;
}): React.JSX.Element;
