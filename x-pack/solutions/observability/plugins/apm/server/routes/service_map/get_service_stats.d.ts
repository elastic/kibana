import type { ServicesResponse } from '../../../common/service_map/types';
import type { IEnvOptions } from './get_service_map';
export declare function getServiceStats({ environment, apmEventClient, searchAggregatedTransactions, start, end, maxNumberOfServices, serviceGroupKuery, serviceName, kuery, esQuery, }: IEnvOptions & {
    maxNumberOfServices: number;
}): Promise<ServicesResponse[]>;
