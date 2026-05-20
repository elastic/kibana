import type { SavedObjectsClient } from '@kbn/core/server';
import { type APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { APMDataTelemetry } from '../types';
import type { TelemetryClient } from '../telemetry_client';
type ISavedObjectsClient = Pick<SavedObjectsClient, 'find'>;
interface TelemetryTask {
    name: string;
    executor: (params: TelemetryTaskExecutorParams) => Promise<APMDataTelemetry>;
}
export interface TelemetryTaskExecutorParams {
    telemetryClient: TelemetryClient;
    indices: APMIndices;
    savedObjectsClient: ISavedObjectsClient;
}
export declare const tasks: TelemetryTask[];
export {};
