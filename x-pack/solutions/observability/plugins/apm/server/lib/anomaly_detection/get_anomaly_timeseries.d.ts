import type { Logger } from '@kbn/logging';
import type { Environment } from '../../../common/environment_rt';
import type { ServiceAnomalyTimeseries } from '../../../common/anomaly_detection/service_anomaly_timeseries';
import type { MlClient } from '../helpers/get_ml_client';
export declare function getAnomalyTimeseries({ serviceName, transactionType, start, end, logger, mlClient, environment: preferredEnvironment, }: {
    serviceName: string;
    transactionType: string;
    start: number;
    end: number;
    environment: Environment;
    logger: Logger;
    mlClient: MlClient;
}): Promise<ServiceAnomalyTimeseries[]>;
