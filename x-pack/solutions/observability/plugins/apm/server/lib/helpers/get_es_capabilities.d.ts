import type { APMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
export declare function getESCapabilities({ core }: APMRouteHandlerResources): Promise<import("@kbn/core/packages/elasticsearch/server").ElasticsearchCapabilities>;
