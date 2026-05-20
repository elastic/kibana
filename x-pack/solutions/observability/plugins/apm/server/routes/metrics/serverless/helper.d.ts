import type { AwsLambdaArchitecture, AWSLambdaPriceFactor } from './get_serverless_summary';
export declare function calcMemoryUsedRate({ memoryFree, memoryTotal, }: {
    memoryFree?: number | null;
    memoryTotal?: number | null;
}): number | undefined;
export declare function calcMemoryUsed({ memoryFree, memoryTotal, }: {
    memoryFree?: number | null;
    memoryTotal?: number | null;
}): number | undefined;
/**
 * To calculate the compute usage we need to multiply the "system.memory.total" by "faas.billed_duration".
 * But the result of this calculation is in Bytes-milliseconds, as the "system.memory.total" is stored in bytes and the "faas.billed_duration" is stored in milliseconds.
 * But to calculate the overall cost AWS uses GB-second, so we need to convert the result to this unit.
 */
export declare function convertComputeUsageToGbSec({ computeUsageBytesMs, countInvocations, }: {
    computeUsageBytesMs?: number | null;
    countInvocations?: number | null;
}): number | undefined;
export declare function calcEstimatedCost({ awsLambdaPriceFactor, architecture, transactionThroughput, awsLambdaRequestCostPerMillion, computeUsageGbSec, }: {
    awsLambdaPriceFactor?: AWSLambdaPriceFactor;
    architecture?: AwsLambdaArchitecture;
    transactionThroughput: number;
    awsLambdaRequestCostPerMillion?: number;
    computeUsageGbSec?: number;
}): number | undefined;
