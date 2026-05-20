import type { APMEventClient } from '../create_es_client/create_apm_event_client';
import type { APMConfig } from '../../..';
export declare function getIsUsingTransactionEvents({ config, apmEventClient, kuery, start, end, }: {
    config: APMConfig;
    apmEventClient: APMEventClient;
    kuery: string;
    start?: number;
    end?: number;
}): Promise<boolean>;
