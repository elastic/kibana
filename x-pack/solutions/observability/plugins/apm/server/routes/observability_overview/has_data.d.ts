import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export interface HasDataResponse {
    hasData: boolean;
    indices: Readonly<{
        error: string;
        onboarding: string;
        span: string;
        transaction: string;
        metric: string;
    }>;
}
export declare function getHasData({ indices, apmEventClient, }: {
    indices: APMIndices;
    apmEventClient: APMEventClient;
}): Promise<HasDataResponse>;
