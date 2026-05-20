import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { APMPluginStartDependencies } from '../../../types';
export declare function addApiKeysToEveryPackagePolicyIfMissing({ coreStartPromise, pluginStartPromise, logger, licensing, }: {
    coreStartPromise: Promise<CoreStart>;
    pluginStartPromise: Promise<APMPluginStartDependencies>;
    logger: Logger;
    licensing: LicensingPluginSetup;
}): Promise<(PackagePolicy | undefined)[] | undefined>;
export declare function addApiKeysToPackagePolicyIfMissing({ policy, coreStart, savedObjectsClient, fleet, logger, }: {
    policy: PackagePolicy;
    savedObjectsClient: SavedObjectsClientContract;
    coreStart: CoreStart;
    fleet: FleetStartContract;
    logger: Logger;
}): Promise<PackagePolicy | undefined>;
