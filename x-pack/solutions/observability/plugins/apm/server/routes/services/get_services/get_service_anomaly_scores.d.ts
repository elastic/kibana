import type { MlClient } from '../../../lib/helpers/get_ml_client';
interface AggregationParams {
    environment: string;
    mlClient?: MlClient;
    start: number;
    end: number;
    searchQuery: string | undefined;
}
export type ServiceAnomalyScoresResponse = Array<{
    serviceName: string;
    anomalyScore: number;
}>;
export declare function getServiceAnomalyScores({ environment, mlClient, start, end, searchQuery, }: AggregationParams): Promise<ServiceAnomalyScoresResponse>;
export {};
