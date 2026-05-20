import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export type AwsLambdaArchitecture = 'arm' | 'x86_64';
export type AWSLambdaPriceFactor = Record<AwsLambdaArchitecture, number>;
export interface ServerlessSummaryResponse {
    memoryUsageAvgRate: number | undefined;
    serverlessFunctionsTotal: number | undefined;
    serverlessDurationAvg: number | null | undefined;
    billedDurationAvg: number | null | undefined;
    estimatedCost: number | undefined;
}
export declare function getServerlessSummary({ end, environment, kuery, serviceName, start, serverlessId, apmEventClient, awsLambdaPriceFactor, awsLambdaRequestCostPerMillion, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    start: number;
    end: number;
    serverlessId?: string;
    apmEventClient: APMEventClient;
    awsLambdaPriceFactor?: AWSLambdaPriceFactor;
    awsLambdaRequestCostPerMillion?: number;
}): Promise<ServerlessSummaryResponse>;
