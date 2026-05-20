import type { ReactNode } from 'react';
import React from 'react';
import type { History } from 'history';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import type { ServerlessType } from '../../../common/serverless';
export interface APMServiceContextValue {
    serviceName: string;
    agentName?: string;
    telemetrySdkName?: string;
    telemetrySdkLanguage?: string;
    serverlessType?: ServerlessType;
    transactionType?: string;
    transactionTypeStatus: FETCH_STATUS;
    transactionTypes: string[];
    runtimeName?: string;
    runtimeVersion?: string;
    fallbackToTransactions: boolean;
    serviceAgentStatus: FETCH_STATUS;
}
export declare const APMServiceContext: React.Context<APMServiceContextValue>;
export declare function ApmServiceContextProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
export declare function getTransactionType({ transactionType, transactionTypes, agentName, }: {
    transactionType?: string;
    transactionTypes: string[];
    agentName?: string;
}): string | undefined;
export declare function getOrRedirectToTransactionType({ transactionType, transactionTypes, agentName, history, }: {
    transactionType?: string;
    transactionTypes: string[];
    agentName?: string;
    history: History;
}): string | undefined;
