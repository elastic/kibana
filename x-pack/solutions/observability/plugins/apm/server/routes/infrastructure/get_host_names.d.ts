import type { InfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
export declare function getContainerHostNames({ containerIds, infraMetricsClient, start, end, }: {
    containerIds: string[];
    infraMetricsClient: InfraMetricsClient;
    start: number;
    end: number;
}): Promise<string[]>;
