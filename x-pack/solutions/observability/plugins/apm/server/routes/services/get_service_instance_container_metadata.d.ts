import type { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import type { InfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
export type ServiceInstanceContainerMetadataDetails = {
    kubernetes: Kubernetes;
} | undefined;
export declare const getServiceInstanceContainerMetadata: ({ infraMetricsClient, containerId, start, end, }: {
    infraMetricsClient: InfraMetricsClient;
    containerId: string;
    start: number;
    end: number;
}) => Promise<ServiceInstanceContainerMetadataDetails>;
