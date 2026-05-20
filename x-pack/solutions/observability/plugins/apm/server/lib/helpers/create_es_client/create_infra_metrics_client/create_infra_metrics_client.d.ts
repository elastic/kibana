import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { APMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';
type InfraMetricsSearchParams = Omit<ESSearchRequest, 'index'> & {
    size: number;
    track_total_hits: boolean | number;
};
export type InfraMetricsClient = ReturnType<typeof createInfraMetricsClient>;
export declare function createInfraMetricsClient(resources: APMRouteHandlerResources): {
    search<TDocument, TParams extends InfraMetricsSearchParams>(opts: TParams): Promise<InferSearchResponseOf<TDocument, TParams>>;
};
export {};
