import type { ReactNode } from 'react';
import React from 'react';
import type { SloStatus } from '../../../common/service_inventory';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
export interface MostCriticalSloStatus {
    status: SloStatus | 'noSLOs';
    count: number;
}
export interface ServiceSloContextValue {
    sloFetchStatus: FETCH_STATUS;
    hasSlos: boolean;
    mostCriticalSloStatus: MostCriticalSloStatus;
}
export declare const ServiceSloContext: React.Context<ServiceSloContextValue>;
export declare function ServiceSloContextProvider({ serviceName, environment, children, }: {
    serviceName: string;
    environment: string;
    children: ReactNode;
}): React.JSX.Element;
