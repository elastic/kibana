import type { SearchRequest as ESSearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
export type ApmAlertsClient = Awaited<ReturnType<typeof getApmAlertsClient>>;
export type ApmAlertsRequiredParams = ESSearchRequest & {
    size: number;
    track_total_hits: boolean | number;
    query?: estypes.QueryDslQueryContainer;
    sort?: estypes.SortOptions[];
    _source?: string[] | false;
    search_after?: Array<string | number>;
};
export declare function getApmAlertsClient({ context, plugins, request, }: Pick<MinimalAPMRouteHandlerResources, 'context' | 'plugins' | 'request'>): Promise<{
    search<TParams extends ApmAlertsRequiredParams>(searchParams: TParams): Promise<InferSearchResponseOf<ParsedTechnicalFields, TParams>>;
}>;
