import type { MlClient } from '../../../lib/helpers/get_ml_client';
export interface ServiceAnomalyScoreResponse {
    anomalyScore?: number;
}
/**
 * Max ML record score for a single service in the time range (same aggregation as service inventory).
 * Uses `getServiceAnomalies` with an exact `term` on the ML partition field so short names do not wildcard-match many services.
 */
export declare function getServiceAnomalyScoreForService({ mlClient, environment, start, end, serviceName, }: {
    mlClient: MlClient;
    environment: string;
    start: number;
    end: number;
    serviceName: string;
}): Promise<ServiceAnomalyScoreResponse>;
