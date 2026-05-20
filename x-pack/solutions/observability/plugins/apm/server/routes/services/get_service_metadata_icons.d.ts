import type { ContainerType } from '../../../common/service_metadata';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { ServerlessType } from '../../../common/serverless';
export interface ServiceMetadataIcons {
    agentName?: string;
    containerType?: ContainerType;
    serverlessType?: ServerlessType;
    cloudProvider?: string;
}
export declare const should: {
    exists: {
        field: string;
    };
}[];
export declare function getServiceMetadataIcons({ serviceName, apmEventClient, searchAggregatedTransactions, start, end, }: {
    serviceName: string;
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
}): Promise<ServiceMetadataIcons>;
