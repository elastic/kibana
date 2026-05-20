import type { Logger } from '@kbn/core/server';
import type { TelemetryTaskExecutorParams } from './tasks';
type CollectTelemetryParams = TelemetryTaskExecutorParams & {
    isProd: boolean;
    logger: Logger;
};
export declare function collectDataTelemetry({ indices, telemetryClient, savedObjectsClient, isProd, logger, }: CollectTelemetryParams): Promise<import("utility-types").DeepPartial<import("../types").APMUsage>>;
export {};
