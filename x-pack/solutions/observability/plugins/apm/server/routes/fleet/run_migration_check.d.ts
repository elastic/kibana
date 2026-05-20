import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';
export interface RunMigrationCheckResponse {
    has_cloud_agent_policy: boolean;
    has_cloud_apm_package_policy: boolean;
    cloud_apm_migration_enabled: boolean;
    has_required_role: boolean | undefined;
    cloud_apm_package_policy: PackagePolicy | undefined;
    has_apm_integrations: boolean;
    latest_apm_package_version: string;
}
export declare function runMigrationCheck({ config, plugins, context, core, request, }: Pick<APMRouteHandlerResources, 'plugins' | 'context' | 'core' | 'request' | 'config'> & {
    plugins: Pick<Required<APMRouteHandlerResources['plugins']>, 'fleet' | 'security'>;
}): Promise<RunMigrationCheckResponse>;
