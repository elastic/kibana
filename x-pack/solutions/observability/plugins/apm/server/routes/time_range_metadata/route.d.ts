import * as t from 'io-ts';
import type { TimeRangeMetadata } from '../../../common/time_range_metadata';
export declare const timeRangeMetadataRoute: Record<"GET /internal/apm/time_range_metadata", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/time_range_metadata", t.TypeC<{
    query: t.IntersectionC<[t.TypeC<{
        useSpanName: t.Type<boolean, boolean, unknown>;
    }>, t.TypeC<{
        kuery: t.StringC;
    }>, t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TimeRangeMetadata, import("../typings").APMRouteCreateOptions>>;
