import type { Artifact } from '@kbn/fleet-plugin/server';
import * as t from 'io-ts';
import type { ListSourceMapArtifactsResponse } from '../fleet/source_maps';
export declare const sourceMapRt: t.IntersectionC<[t.TypeC<{
    version: t.NumberC;
    sources: t.ArrayC<t.StringC>;
    mappings: t.StringC;
}>, t.PartialC<{
    names: t.ArrayC<t.StringC>;
    file: t.StringC;
    sourceRoot: t.StringC;
    sourcesContent: t.ArrayC<t.UnionC<[t.StringC, t.NullC]>>;
}>]>;
export type SourceMap = t.TypeOf<typeof sourceMapRt>;
export declare const sourceMapsRouteRepository: {
    "POST /internal/apm/sourcemaps/migrate_fleet_artifacts": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/sourcemaps/migrate_fleet_artifacts", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "DELETE /api/apm/sourcemaps/{id} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/apm/sourcemaps/{id} 2023-10-31", t.TypeC<{
        path: t.TypeC<{
            id: t.StringC;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/sourcemaps 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/apm/sourcemaps 2023-10-31", t.TypeC<{
        body: t.TypeC<{
            service_name: t.StringC;
            service_version: t.StringC;
            bundle_filepath: t.StringC;
            sourcemap: t.Type<{
                version: number;
                sources: string[];
                mappings: string;
            } & {
                names?: string[] | undefined;
                file?: string | undefined;
                sourceRoot?: string | undefined;
                sourcesContent?: (string | null)[] | undefined;
            }, string | Buffer<ArrayBufferLike>, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, Artifact | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/sourcemaps 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/apm/sourcemaps 2023-10-31", t.PartialC<{
        query: t.PartialC<{
            page: t.Type<number, number, unknown>;
            perPage: t.Type<number, number, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ListSourceMapArtifactsResponse | undefined, import("../typings").APMRouteCreateOptions>;
};
