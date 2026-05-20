import type { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';
export declare function getFleetPackageInfo(resources: APMRouteHandlerResources): Promise<{
    isInstalled: boolean;
    version: string | undefined;
}>;
