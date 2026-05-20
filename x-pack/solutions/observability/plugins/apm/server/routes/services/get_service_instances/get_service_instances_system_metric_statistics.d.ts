import type { Coordinate } from '../../../../typings/timeseries';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
interface ServiceInstanceSystemMetricPrimaryStatistics {
    serviceNodeName: string;
    cpuUsage: number | null;
    memoryUsage: number | null;
}
interface ServiceInstanceSystemMetricComparisonStatistics {
    serviceNodeName: string;
    cpuUsage: Coordinate[];
    memoryUsage: Coordinate[];
}
type ServiceInstanceSystemMetricStatistics<T> = T extends true ? ServiceInstanceSystemMetricComparisonStatistics : ServiceInstanceSystemMetricPrimaryStatistics;
export declare function getServiceInstancesSystemMetricStatistics<T extends true | false>({ environment, kuery, apmEventClient, serviceName, size, start, end, serviceNodeIds, numBuckets, includeTimeseries, offset, }: {
    apmEventClient: APMEventClient;
    serviceName: string;
    start: number;
    end: number;
    numBuckets?: number;
    serviceNodeIds?: string[];
    environment: string;
    kuery: string;
    size?: number;
    includeTimeseries: T;
    offset?: string;
}): Promise<Array<ServiceInstanceSystemMetricStatistics<T>>>;
export {};
