import type { CoreStart } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { TelemetryUsageCounter } from '../typings';
import type { APMPluginStartDependencies } from '../../types';
import type { APMInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';
export declare function syncAgentConfigsToApmPackagePolicies({ coreStartPromise, fleetPluginStart, internalESClient, apmIndices, telemetryUsageCounter, }: {
    coreStartPromise: Promise<CoreStart>;
    fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
    internalESClient: APMInternalESClient;
    apmIndices: APMIndices;
    telemetryUsageCounter?: TelemetryUsageCounter;
}): Promise<import("@kbn/fleet-plugin/common").PackagePolicy[]>;
