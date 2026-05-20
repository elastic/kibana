import type { KibanaRequest } from '@kbn/core/server';
import type { APMPluginStartDependencies } from '../../types';
export declare function getLatestApmPackage({ fleetPluginStart, request, }: {
    fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
    request: KibanaRequest;
}): Promise<{
    package: {
        name: string;
        version: string;
        title: string;
    };
    policyTemplateInputVars: import("@kbn/fleet-plugin/common").RegistryVarsEntry[];
}>;
