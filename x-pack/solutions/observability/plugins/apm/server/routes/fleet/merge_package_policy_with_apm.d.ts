import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { APMInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';
import type { APMPluginStartDependencies } from '../../types';
export declare function decoratePackagePolicyWithAgentConfigAndSourceMap({ packagePolicy, internalESClient, fleetPluginStart, apmIndices, }: {
    packagePolicy: NewPackagePolicy;
    internalESClient: APMInternalESClient;
    fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
    apmIndices: APMIndices;
}): Promise<NewPackagePolicy>;
