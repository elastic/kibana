import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { BoolQuery } from '@kbn/es-query';
import type { ReactFlowServiceMapResponse } from '../../../../common/service_map';
import type { Environment } from '../../../../common/environment_rt';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
export interface UseServiceMapResult {
    data: ReactFlowServiceMapResponse;
    error?: Error | IHttpFetchError<ResponseErrorBody>;
    status: FETCH_STATUS;
}
export declare const useServiceMap: ({ start, end, environment, serviceName, serviceGroupId, kuery, strictEnvironmentScope, esQuery, }: {
    environment: Environment;
    kuery: string;
    start: string;
    end: string;
    serviceGroupId?: string;
    serviceName?: string;
    /** Drop cross-env spans before transforming when `environment` is a specific env. */
    strictEnvironmentScope?: boolean;
    /**
     * Pre-built ES query from buildEsQuery() (filter bar + Controls API selections).
     * `null` = search bar mounted but query not yet computed (gate fetch).
     * `undefined` = no search bar provider (embeddable — fetch immediately).
     */
    esQuery?: {
        bool: BoolQuery;
    } | null;
}) => UseServiceMapResult;
