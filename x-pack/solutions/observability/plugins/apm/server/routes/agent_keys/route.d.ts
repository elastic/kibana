import type * as t from 'io-ts';
import type { AgentKeysResponse } from './get_agent_keys';
import type { AgentKeysPrivilegesResponse } from './get_agent_keys_privileges';
import type { InvalidateAgentKeyResponse } from './invalidate_agent_key';
import type { CreateAgentKeyResponse } from './create_agent_key';
export declare const agentKeysRouteRepository: {
    "POST /api/apm/agent_keys 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/apm/agent_keys 2023-10-31", t.TypeC<{
        body: t.TypeC<{
            name: t.StringC;
            privileges: t.ArrayC<t.UnionC<[t.LiteralC<import("../../../common/privilege_type").PrivilegeType.EVENT>, t.LiteralC<import("../../../common/privilege_type").PrivilegeType.AGENT_CONFIG>]>>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, CreateAgentKeyResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/api_key/invalidate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/api_key/invalidate", t.TypeC<{
        body: t.TypeC<{
            id: t.StringC;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, InvalidateAgentKeyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/agent_keys/privileges": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/agent_keys/privileges", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, AgentKeysPrivilegesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/agent_keys": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/agent_keys", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, AgentKeysResponse, import("../typings").APMRouteCreateOptions>;
};
