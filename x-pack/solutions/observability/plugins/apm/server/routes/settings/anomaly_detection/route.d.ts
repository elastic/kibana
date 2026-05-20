import type * as t from 'io-ts';
import type { ApmMlJob } from '../../../../common/anomaly_detection/apm_ml_job';
export declare const anomalyDetectionRouteRepository: {
    "POST /internal/apm/settings/anomaly-detection/update_to_v3": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/settings/anomaly-detection/update_to_v3", undefined, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        update: boolean;
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/anomaly-detection/environments": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/settings/anomaly-detection/environments", undefined, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        environments: string[];
    }, import("../../typings").APMRouteCreateOptions>;
    "POST /internal/apm/settings/anomaly-detection/jobs": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/settings/anomaly-detection/jobs", t.TypeC<{
        body: t.TypeC<{
            environments: t.ArrayC<t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>>;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        jobCreated: true;
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/anomaly-detection/jobs": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/settings/anomaly-detection/jobs", undefined, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        jobs: ApmMlJob[];
        hasLegacyJobs: boolean;
    }, import("../../typings").APMRouteCreateOptions>;
};
