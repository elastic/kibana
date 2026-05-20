import type { InfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
export declare const getServiceOverviewContainerMetadata: ({ infraMetricsClient, containerIds, start, end, }: {
    infraMetricsClient: InfraMetricsClient;
    containerIds: string[];
    start: number;
    end: number;
}) => Promise<{
    kubernetes: {
        deployments: (string | number)[] | undefined;
        replicasets: (string | number)[] | undefined;
        namespaces: (string | number)[] | undefined;
        containerImages: (string | number)[] | undefined;
    };
}>;
