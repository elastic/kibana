import type * as t from 'io-ts';
export declare const infrastructureRouteRepository: {
    "GET /internal/apm/services/{serviceName}/infrastructure_attributes": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/infrastructure_attributes", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.PartialC<{
            agentName: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        containerIds: string[];
        hostNames: string[];
        podNames: string[];
    }, import("../typings").APMRouteCreateOptions>;
};
