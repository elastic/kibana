import * as t from 'io-ts';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import type { CustomLink } from '../../../../common/custom_link/custom_link_types';
export declare const customLinkRouteRepository: {
    "DELETE /internal/apm/settings/custom_links/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/apm/settings/custom_links/{id}", t.TypeC<{
        path: t.TypeC<{
            id: t.StringC;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        result: string;
    }, import("../../typings").APMRouteCreateOptions>;
    "PUT /internal/apm/settings/custom_links/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/apm/settings/custom_links/{id}", t.TypeC<{
        path: t.TypeC<{
            id: t.StringC;
        }>;
        body: t.IntersectionC<[t.TypeC<{
            label: t.StringC;
            url: t.StringC;
        }>, t.PartialC<{
            id: t.StringC;
            filters: t.ArrayC<t.TypeC<{
                key: t.UnionC<[t.LiteralC<"">, t.KeyofC<{
                    'service.name': t.StringC;
                    'service.environment': t.StringC;
                    'transaction.name': t.StringC;
                    'transaction.type': t.StringC;
                }>]>;
                value: t.StringC;
            }>>;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../../typings").APMRouteCreateOptions>;
    "POST /internal/apm/settings/custom_links": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/settings/custom_links", t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            label: t.StringC;
            url: t.StringC;
        }>, t.PartialC<{
            id: t.StringC;
            filters: t.ArrayC<t.TypeC<{
                key: t.UnionC<[t.LiteralC<"">, t.KeyofC<{
                    'service.name': t.StringC;
                    'service.environment': t.StringC;
                    'transaction.name': t.StringC;
                    'transaction.type': t.StringC;
                }>]>;
                value: t.StringC;
            }>>;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/custom_links": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/settings/custom_links", t.PartialC<{
        query: t.PartialC<{
            'service.name': t.StringC;
            'service.environment': t.StringC;
            'transaction.name': t.StringC;
            'transaction.type': t.StringC;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        customLinks: CustomLink[];
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/custom_links/transaction": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/settings/custom_links/transaction", t.PartialC<{
        query: t.PartialC<{
            'service.name': t.StringC;
            'service.environment': t.StringC;
            'transaction.name': t.StringC;
            'transaction.type': t.StringC;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, Transaction, import("../../typings").APMRouteCreateOptions>;
};
