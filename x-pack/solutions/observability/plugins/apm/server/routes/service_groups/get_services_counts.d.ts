import type { SavedServiceGroup } from '../../../common/service_groups';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getServicesCounts({ apmEventClient, start, end, serviceGroups, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    serviceGroups: SavedServiceGroup[];
}): Promise<Record<string, number>>;
