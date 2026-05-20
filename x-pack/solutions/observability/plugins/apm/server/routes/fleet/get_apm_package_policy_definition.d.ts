import type { KibanaRequest } from '@kbn/core/server';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
export declare function getApmPackagePolicyDefinition({ apmServerSchema, cloudPluginSetup, fleetPluginStart, request, }: {
    apmServerSchema: Record<string, any>;
    cloudPluginSetup: APMPluginSetupDependencies['cloud'];
    fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
    request: KibanaRequest;
}): Promise<{
    name: string;
    namespace: string;
    enabled: boolean;
    policy_ids: string[];
    inputs: {
        type: string;
        enabled: boolean;
        streams: never[];
        vars: Record<string, {
            type: string;
            value: any;
        }>;
    }[];
    package: {
        name: string;
        version: string;
        title: string;
    };
}>;
