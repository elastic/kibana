import type { CoreStart } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
export interface FleetAgentResponse {
    cloudStandaloneSetup: {
        apmServerUrl: string | undefined;
        secretToken: string | undefined;
    } | undefined;
    isFleetEnabled: boolean;
    fleetAgents: Array<{
        id: string;
        name: string;
        apmServerUrl: any;
        secretToken: any;
    }>;
}
export declare function getFleetAgents({ fleetPluginStart, cloudPluginSetup, coreStart, }: {
    fleetPluginStart?: FleetStartContract;
    cloudPluginSetup?: CloudSetup;
    coreStart: CoreStart;
}): Promise<FleetAgentResponse>;
