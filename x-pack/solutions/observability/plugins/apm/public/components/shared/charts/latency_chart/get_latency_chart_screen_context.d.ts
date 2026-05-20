import type { Environment } from '../../../../../common/environment_rt';
export declare function getLatencyChartScreenContext({ serviceName, transactionName, transactionType, environment, bucketSizeInSeconds, }: {
    serviceName?: string;
    transactionName?: string;
    transactionType?: string;
    environment?: Environment;
    bucketSizeInSeconds?: number;
}): {
    screenDescription: string;
};
