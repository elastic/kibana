import type { MobilePropertyType } from '../../../common/mobile_types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export type MobileFiltersResponse = Array<{
    key: MobilePropertyType;
    options: string[];
}>;
export declare function getMobileFilters({ kuery, apmEventClient, serviceName, transactionType, environment, start, end, }: {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    transactionType?: string;
    environment: string;
    start: number;
    end: number;
}): Promise<MobileFiltersResponse>;
