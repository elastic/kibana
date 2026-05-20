import type { Logger } from '@kbn/core/server';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
export type ApmAnomalies = Awaited<ReturnType<typeof getAnomalies>>;
export declare function getAnomalies({ serviceName, transactionType, environment, start, end, mlClient, logger, }: {
    serviceName?: string;
    transactionType?: string;
    environment?: string;
    start: number;
    end: number;
    mlClient?: MlClient;
    logger: Logger;
}): Promise<{
    '@timestamp': string;
    metricName: string;
    "service.name": string;
    "service.environment": string | import("io-ts").Branded<string, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
    "transaction.type": string;
    anomalyScore: string | number | null;
    actualValue: number;
    expectedBoundsLower: number;
    expectedBoundsUpper: number;
}[]>;
