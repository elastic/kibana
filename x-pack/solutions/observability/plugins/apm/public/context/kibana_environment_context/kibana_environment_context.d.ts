import React from 'react';
export interface KibanaEnvContext {
    kibanaVersion?: string;
    isCloudEnv?: boolean;
    isServerlessEnv?: boolean;
}
export declare const KibanaEnvironmentContext: React.Context<KibanaEnvContext>;
export declare function KibanaEnvironmentContextProvider({ children, kibanaEnvironment, }: {
    kibanaEnvironment: KibanaEnvContext;
    children: React.ReactElement;
}): React.JSX.Element;
