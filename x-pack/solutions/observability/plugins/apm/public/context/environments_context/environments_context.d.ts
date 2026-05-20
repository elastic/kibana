import React from 'react';
import type { Environment } from '../../../common/environment_rt';
import type { FETCH_STATUS } from '../../hooks/use_fetcher';
export declare const EnvironmentsContext: React.Context<{
    environment: Environment;
    environments: Environment[];
    status: FETCH_STATUS;
    preferredEnvironment: Environment;
    serviceName?: string;
    rangeFrom?: string;
    rangeTo?: string;
}>;
export declare function EnvironmentsContextProvider({ children, customTimeRange, }: {
    children: React.ReactElement;
    customTimeRange?: {
        rangeFrom: string;
        rangeTo: string;
    };
}): React.JSX.Element;
