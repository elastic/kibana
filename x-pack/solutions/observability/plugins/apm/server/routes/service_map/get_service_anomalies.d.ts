import type { ServiceAnomaliesResponse } from '@kbn/apm-types';
import type { MlAnomalyDetectors } from '@kbn/ml-plugin/server';
import type { MlClient } from '../../lib/helpers/get_ml_client';
export declare const DEFAULT_ANOMALIES: ServiceAnomaliesResponse;
export declare function getServiceAnomalies({ mlClient, environment, start, end, searchQuery, exactServiceName, }: {
    mlClient?: MlClient;
    environment: string;
    start: number;
    end: number;
    /** Substring search (inventory, etc.); uses a case-insensitive wildcard on the ML partition field. */
    searchQuery?: string;
    /** When set, matches that service only via a `term` filter (avoids wildcard fan-out for short names). Ignores `searchQuery` for the service-name clause. */
    exactServiceName?: string;
}): Promise<ServiceAnomaliesResponse>;
export declare function getMLJobs(anomalyDetectors: MlAnomalyDetectors, environment?: string): Promise<import("@kbn/apm-types").ApmMlJob[]>;
export declare function getMLJobIds(anomalyDetectors: MlAnomalyDetectors, environment?: string): Promise<string[]>;
