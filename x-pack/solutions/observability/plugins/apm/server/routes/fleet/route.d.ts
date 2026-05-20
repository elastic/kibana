import type * as t from 'io-ts';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { FleetAgentResponse } from './get_agents';
import type { UnsupportedApmServerSchema } from './get_unsupported_apm_server_schema';
import type { RunMigrationCheckResponse } from './run_migration_check';
export declare const apmFleetRouteRepository: {
    "GET /internal/apm/fleet/java_agent_versions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/fleet/java_agent_versions", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        versions: string[] | undefined;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/fleet/cloud_apm_package_policy": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/fleet/cloud_apm_package_policy", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        cloudApmPackagePolicy: PackagePolicy;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/migration_check": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/fleet/migration_check", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, RunMigrationCheckResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/apm_server_schema/unsupported": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/fleet/apm_server_schema/unsupported", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        unsupported: UnsupportedApmServerSchema;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/fleet/apm_server_schema 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/apm/fleet/apm_server_schema 2023-10-31", t.TypeC<{
        body: t.TypeC<{
            schema: t.RecordC<t.StringC, t.UnknownC>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/agents": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/fleet/agents", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, FleetAgentResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/has_apm_policies": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/fleet/has_apm_policies", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        hasApmPolicies: boolean;
    }, import("../typings").APMRouteCreateOptions>;
};
