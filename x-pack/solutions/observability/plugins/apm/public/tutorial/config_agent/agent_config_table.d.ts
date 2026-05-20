import React from 'react';
export declare function AgentConfigurationTable({ variables, data, }: {
    variables: {
        [key: string]: string;
    };
    data: {
        apmServerUrl?: string;
        secretToken?: string;
        apmServiceName: string;
        apmEnvironment: string;
    };
}): React.JSX.Element | null;
