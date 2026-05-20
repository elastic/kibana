import type { KibanaRequest } from '@kbn/core/server';
/**
 * Reads Cross-Project Search routing from the incoming Kibana request header
 * so Elasticsearch queries can apply the same routing as the browser session.
 */
export declare function getProjectRoutingFromRequest(request?: KibanaRequest): string | undefined;
