import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { MobilePropertyType } from '../../../../common/mobile_types';
export type MobileMostUsedChartResponse = Array<{
    key: MobilePropertyType;
    options: Array<{
        key: string | number;
        docCount: number;
    }>;
}>;
export declare function getMobileMostUsedCharts({ kuery, apmEventClient, serviceName, transactionType, environment, start, end, }: {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    transactionType?: string;
    environment: string;
    start: number;
    end: number;
}): Promise<MobileMostUsedChartResponse>;
