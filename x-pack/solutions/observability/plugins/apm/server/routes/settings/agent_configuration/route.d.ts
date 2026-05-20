import type { SearchHit } from '@kbn/es-types';
import * as t from 'io-ts';
import type { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import type { EnvironmentsResponse } from './get_environments';
declare const searchParamsRt: t.IntersectionC<[t.TypeC<{
    service: t.PartialC<{
        name: t.StringC;
        environment: t.StringC;
    }>;
}>, t.PartialC<{
    etag: t.StringC;
    mark_as_applied_by_agent: t.BooleanC;
    error: t.StringC;
}>]>;
export type AgentConfigSearchParams = t.TypeOf<typeof searchParamsRt>;
export declare const agentConfigurationRouteRepository: {
    "GET /api/apm/settings/agent-configuration/agent_name 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/apm/settings/agent-configuration/agent_name 2023-10-31", t.TypeC<{
        query: t.TypeC<{
            serviceName: t.StringC;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        agentName: string | undefined;
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /api/apm/settings/agent-configuration/environments 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/apm/settings/agent-configuration/environments 2023-10-31", t.PartialC<{
        query: t.PartialC<{
            serviceName: t.StringC;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        environments: EnvironmentsResponse;
    }, import("../../typings").APMRouteCreateOptions>;
    "POST /api/apm/settings/agent-configuration/search 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/apm/settings/agent-configuration/search 2023-10-31", t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            service: t.PartialC<{
                name: t.StringC;
                environment: t.StringC;
            }>;
        }>, t.PartialC<{
            etag: t.StringC;
            mark_as_applied_by_agent: t.BooleanC;
            error: t.StringC;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, SearchHit<AgentConfiguration, undefined, undefined> | null, import("../../typings").APMRouteCreateOptions>;
    "PUT /api/apm/settings/agent-configuration 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/apm/settings/agent-configuration 2023-10-31", t.IntersectionC<[t.PartialC<{
        query: t.PartialC<{
            overwrite: t.Type<boolean, boolean, unknown>;
        }>;
    }>, t.TypeC<{
        body: t.IntersectionC<[t.PartialC<{
            agent_name: t.StringC;
        }>, t.TypeC<{
            service: t.PartialC<{
                name: t.StringC;
                environment: t.StringC;
            }>;
            settings: t.IntersectionC<[t.RecordC<t.StringC, t.StringC>, t.PartialC<Record<string, import("../../../../common/agent_configuration/setting_definitions/types").SettingValidation>>]>;
        }>]>;
    }>]>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../../typings").APMRouteCreateOptions>;
    "DELETE /api/apm/settings/agent-configuration 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/apm/settings/agent-configuration 2023-10-31", t.TypeC<{
        body: t.TypeC<{
            service: t.PartialC<{
                name: t.StringC;
                environment: t.StringC;
            }>;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        result: string;
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /api/apm/settings/agent-configuration/view 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/apm/settings/agent-configuration/view 2023-10-31", t.PartialC<{
        query: t.PartialC<{
            name: t.StringC;
            environment: t.StringC;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, AgentConfiguration, import("../../typings").APMRouteCreateOptions>;
    "GET /api/apm/settings/agent-configuration 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/apm/settings/agent-configuration 2023-10-31", undefined, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        configurations: AgentConfiguration[];
    }, import("../../typings").APMRouteCreateOptions>;
};
export {};
