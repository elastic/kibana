import type { CoreSetup, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import type { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import type { getMlClient } from '../../lib/helpers/get_ml_client';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
export interface ApmToolResources {
    apmEventClient: Awaited<ReturnType<typeof getApmEventClient>>;
    apmDataAccessServices: ApmDataAccessServices;
    randomSamplerSeed: number;
    mlClient: Awaited<ReturnType<typeof getMlClient>>;
    apmAlertsClient: ApmAlertsClient;
    esClient: IScopedClusterClient;
    soClient: SavedObjectsClientContract;
}
export declare function buildApmToolResources({ core, plugins, request, esClient, }: {
    core: CoreSetup<APMPluginStartDependencies>;
    plugins: APMPluginSetupDependencies;
    request: KibanaRequest;
    esClient?: IScopedClusterClient;
}): Promise<ApmToolResources>;
