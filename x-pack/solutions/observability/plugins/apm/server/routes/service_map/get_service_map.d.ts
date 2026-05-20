import type { Logger } from '@kbn/core/server';
import type { BoolQuery } from '@kbn/es-query';
import { type ServiceMapResponse } from '../../../common/service_map';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';
export interface IEnvOptions {
    mlClient?: MlClient;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName?: string;
    environment: string;
    searchAggregatedTransactions: boolean;
    logger: Logger;
    start: number;
    end: number;
    serviceGroupKuery?: string;
    kuery?: string;
    /** Pre-built ES query from the client (query + filter bar + Controls API). */
    esQuery?: {
        bool: BoolQuery;
    };
}
export declare function getServiceMap(options: IEnvOptions & {
    maxNumberOfServices: number;
}): Promise<ServiceMapResponse>;
