import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreSetup, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare const APM_TELEMETRY_TASK_NAME = "apm-telemetry-task";
export declare function createApmTelemetry({ core, getApmIndices, usageCollector, taskManager, logger, kibanaVersion, isProd, }: {
    core: CoreSetup;
    getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
    usageCollector: UsageCollectionSetup;
    taskManager: TaskManagerSetupContract;
    logger: Logger;
    kibanaVersion: string;
    isProd: boolean;
}): Promise<void>;
