import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { APMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';
interface LogsClientSearchRequest {
    query: QueryDslQueryContainer;
    fields: string[];
}
export interface LogsClient {
    search: <T = unknown>(props: LogsClientSearchRequest) => Promise<InferSearchResponseOf<T>>;
}
export declare const createLogsClient: (resources: APMRouteHandlerResources) => Promise<LogsClient>;
export {};
