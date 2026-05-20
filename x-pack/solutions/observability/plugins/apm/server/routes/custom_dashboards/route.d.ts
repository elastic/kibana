import * as t from 'io-ts';
import type { SavedApmCustomDashboard } from '../../../common/custom_dashboards';
export declare const serviceDashboardsRouteRepository: {
    "GET /internal/apm/services/{serviceName}/dashboards": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/dashboards", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        serviceDashboards: SavedApmCustomDashboard[];
    }, import("../typings").APMRouteCreateOptions>;
    "DELETE /internal/apm/custom-dashboard": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/apm/custom-dashboard", t.TypeC<{
        query: t.TypeC<{
            customDashboardId: t.StringC;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/custom-dashboard": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/custom-dashboard", t.TypeC<{
        query: t.UnionC<[t.PartialC<{
            customDashboardId: t.StringC;
        }>, t.UndefinedC]>;
        body: t.TypeC<{
            dashboardSavedObjectId: t.StringC;
            kuery: t.UnionC<[t.StringC, t.UndefinedC]>;
            serviceNameFilterEnabled: t.BooleanC;
            serviceEnvironmentFilterEnabled: t.BooleanC;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, SavedApmCustomDashboard, import("../typings").APMRouteCreateOptions>;
};
