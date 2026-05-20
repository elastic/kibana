import type * as t from 'io-ts';
import type { filterOptionsRt } from './custom_link_types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransaction({ apmEventClient, filters, }: {
    apmEventClient: APMEventClient;
    filters?: t.TypeOf<typeof filterOptionsRt>;
}): Promise<import("@kbn/apm-types").Transaction>;
