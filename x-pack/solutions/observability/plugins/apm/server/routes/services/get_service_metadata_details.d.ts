import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export interface ServiceMetadataDetails {
    service?: {
        versions?: string[];
        runtime?: {
            name?: string;
            version?: string;
        };
        framework?: string;
        agent: {
            name: string;
            version: string;
        };
    };
    opentelemetry?: {
        language?: string;
        sdkVersion?: string;
        autoVersion?: string;
    };
    container?: {
        ids?: string[];
        image?: string;
        os?: string;
        totalNumberInstances?: number;
    };
    serverless?: {
        type?: string;
        functionNames?: string[];
        faasTriggerTypes?: string[];
        hostArchitecture?: string;
    };
    cloud?: {
        provider?: string;
        availabilityZones?: string[];
        regions?: string[];
        machineTypes?: string[];
        projectName?: string;
        serviceName?: string;
    };
    kubernetes?: {
        deployments?: string[];
        namespaces?: string[];
        replicasets?: string[];
        containerImages?: string[];
    };
}
export declare function getServiceMetadataDetails({ serviceName, environment, apmEventClient, start, end, }: {
    serviceName: string;
    environment: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<ServiceMetadataDetails>;
