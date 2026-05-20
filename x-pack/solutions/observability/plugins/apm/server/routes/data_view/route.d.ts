import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare const dataViewRouteRepository: {
    "GET /internal/apm/data_view/index_pattern": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/data_view/index_pattern", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        apmDataViewIndexPattern: string;
        apmIndices: APMIndices;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/data_view/static": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/data_view/static", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        created: boolean;
        dataView: import("@kbn/data-views-plugin/common").DataView;
    } | {
        created: boolean;
        reason?: string;
    }, import("../typings").APMRouteCreateOptions>;
};
