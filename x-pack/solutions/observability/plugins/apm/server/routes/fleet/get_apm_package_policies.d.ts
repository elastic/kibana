import type { CoreStart } from '@kbn/core/server';
import type { APMPluginStartDependencies } from '../../types';
export declare function getApmPackagePolicies({ coreStart, fleetPluginStart, }: {
    coreStart: CoreStart;
    fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
}): Promise<import("@kbn/fleet-plugin/common").ListResult<import("@kbn/fleet-plugin/common").PackagePolicy>>;
