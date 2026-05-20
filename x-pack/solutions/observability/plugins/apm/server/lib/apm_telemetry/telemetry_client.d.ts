import type { estypes } from '@elastic/elasticsearch';
import type { CoreSetup } from '@kbn/core/server';
import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
interface RequiredSearchParams {
    index: string | string[];
    size: number;
    track_total_hits: boolean | number;
    timeout: string;
}
export interface IndicesStatsResponse {
    _all?: {
        total?: {
            store?: {
                size_in_bytes?: number;
            };
            docs?: {
                count?: number;
            };
        };
        primaries?: {
            docs?: {
                count?: number;
            };
            store?: {
                size_in_bytes?: number;
                total_data_set_size_in_bytes?: number;
            };
        };
    };
    _shards?: {
        total?: number;
    };
}
export interface TelemetryClient {
    search<TSearchRequest extends ESSearchRequest & RequiredSearchParams>(params: TSearchRequest): Promise<ESSearchResponse<unknown, TSearchRequest>>;
    indicesStats(params: estypes.IndicesStatsRequest): Promise<IndicesStatsResponse>;
    transportRequest: (params: {
        path: string;
        method: 'get';
    }) => Promise<unknown>;
    fieldCaps(params: estypes.FieldCapsRequest): Promise<estypes.FieldCapsResponse>;
}
export declare function getTelemetryClient({ core }: {
    core: CoreSetup;
}): Promise<TelemetryClient>;
export {};
