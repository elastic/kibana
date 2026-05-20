import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Maybe } from '../../../typings/common';
import type { APMPluginStartDependencies } from '../../types';
export declare const APM_PACKAGE_NAME = "apm";
export declare function getCloudAgentPolicy({ fleetPluginStart, savedObjectsClient, }: {
    fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
    savedObjectsClient: SavedObjectsClientContract;
}): Promise<AgentPolicy | null | undefined>;
export declare function getApmPackagePolicy(agentPolicy: Maybe<AgentPolicy>): PackagePolicy | undefined;
