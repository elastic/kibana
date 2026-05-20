import type * as t from 'io-ts';
import type { AgentExplorerAgentsResponse } from './get_agents';
import type { AgentExplorerAgentInstancesResponse } from './get_agent_instances';
import type { AgentLatestVersionsResponse } from './fetch_agents_latest_version';
export declare const agentExplorerRouteRepository: {
    "GET /internal/apm/services/{serviceName}/agent_instances": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/agent_instances", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        items: AgentExplorerAgentInstancesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/get_latest_agent_versions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/get_latest_agent_versions", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, AgentLatestVersionsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/get_agents_per_service": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/get_agents_per_service", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>, t.PartialC<{
            serviceName: t.StringC;
            agentLanguage: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, AgentExplorerAgentsResponse, import("../typings").APMRouteCreateOptions>;
};
