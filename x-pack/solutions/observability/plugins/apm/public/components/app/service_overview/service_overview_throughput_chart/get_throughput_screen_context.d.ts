import type { Environment } from '../../../../../common/environment_rt';
export declare function getThroughputScreenContext({ serviceName, transactionName, transactionType, environment, preferred, }: {
    serviceName?: string;
    transactionName?: string;
    transactionType?: string;
    environment?: Environment;
    preferred: {
        bucketSizeInSeconds: number;
    } | null;
}): {
    screenDescription: string;
};
