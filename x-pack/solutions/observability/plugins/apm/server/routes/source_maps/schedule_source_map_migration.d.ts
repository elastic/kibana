import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { APMPluginStartDependencies } from '../../types';
export declare function scheduleSourceMapMigration({ coreStartPromise, pluginStartPromise, taskManager, logger, }: {
    coreStartPromise: Promise<CoreStart>;
    pluginStartPromise: Promise<APMPluginStartDependencies>;
    taskManager?: TaskManagerSetupContract;
    logger: Logger;
}): Promise<void>;
interface TaskState {
    isAborted: boolean;
}
export declare function runFleetSourcemapArtifactsMigration({ taskState, fleet, internalESClient, logger, }: {
    taskState?: TaskState;
    fleet: FleetStartContract;
    internalESClient: ElasticsearchClient;
    logger: Logger;
}): Promise<void>;
export {};
