import type { SearchRequest as ESSearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ESSearchResponse } from '@kbn/es-types';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';
export type APMEventESSearchRequestParams = ESSearchRequest & {
    size: number;
    track_total_hits: boolean | number;
};
export declare function alertingEsClient<TParams extends APMEventESSearchRequestParams>({ scopedClusterClient, uiSettingsClient, params, }: {
    scopedClusterClient: RuleExecutorServices<never, never, never>['scopedClusterClient'];
    uiSettingsClient: IUiSettingsClient;
    params: TParams;
}): Promise<ESSearchResponse<unknown, TParams>>;
