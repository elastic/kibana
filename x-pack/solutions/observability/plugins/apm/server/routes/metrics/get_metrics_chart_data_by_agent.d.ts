import type { GenericMetricsChart } from './fetch_and_transform_metrics';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getMetricsChartDataByAgent({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, agentName, start, end, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    agentName: string;
    start: number;
    end: number;
}): Promise<GenericMetricsChart[]>;
