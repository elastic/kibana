import * as t from 'io-ts';
export declare enum PrivilegeType {
    EVENT = "event:write",
    AGENT_CONFIG = "config_agent:read"
}
export declare enum ClusterPrivilegeType {
    MANAGE_OWN_API_KEY = "manage_own_api_key"
}
export declare const privilegesTypeRt: t.ArrayC<t.UnionC<[t.LiteralC<PrivilegeType.EVENT>, t.LiteralC<PrivilegeType.AGENT_CONFIG>]>>;
