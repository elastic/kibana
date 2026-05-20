import type { Logger } from '@kbn/logging';
import type { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import type { ServiceGroup } from '../../../../common/service_groups';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import type { ApmSloClient } from '../../../lib/helpers/get_apm_slo_client';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import type { MergedServiceStat } from './merge_service_stats';
export declare const MAX_NUMBER_OF_SERVICES = 1000;
export interface ServicesItemsResponse {
    items: MergedServiceStat[];
    maxCountExceeded: boolean;
    serviceOverflowCount: number;
}
export declare function getServicesItems({ environment, kuery, mlClient, apmEventClient, apmAlertsClient, sloClient, logger, start, end, serviceGroup, randomSampler, documentType, rollupInterval, useDurationSummary, searchQuery, }: {
    environment: string;
    kuery: string;
    mlClient?: MlClient;
    apmEventClient: APMEventClient;
    apmAlertsClient: ApmAlertsClient;
    sloClient?: ApmSloClient;
    logger: Logger;
    start: number;
    end: number;
    serviceGroup: ServiceGroup | null;
    randomSampler: RandomSampler;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    useDurationSummary: boolean;
    searchQuery?: string;
}): Promise<ServicesItemsResponse>;
