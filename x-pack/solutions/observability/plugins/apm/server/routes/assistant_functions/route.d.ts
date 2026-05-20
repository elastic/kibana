import type * as t from 'io-ts';
import { type APMDownstreamDependency } from './get_apm_downstream_dependencies';
import { type ApmTimeseries } from './get_apm_timeseries';
export declare const assistantRouteRepository: {
    "GET /internal/apm/assistant/get_downstream_dependencies": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/assistant/get_downstream_dependencies", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            serviceName: t.StringC;
            start: t.StringC;
            end: t.StringC;
        }>, t.PartialC<{
            serviceEnvironment: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        content: APMDownstreamDependency[];
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/assistant/get_apm_timeseries": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/assistant/get_apm_timeseries", t.TypeC<{
        body: t.TypeC<{
            stats: t.ArrayC<t.IntersectionC<[t.TypeC<{
                'service.name': t.StringC;
                title: t.StringC;
                timeseries: t.UnionC<[t.IntersectionC<[t.TypeC<{
                    name: t.UnionC<[t.LiteralC<import("./get_apm_timeseries").ApmTimeseriesType.transactionThroughput>, t.LiteralC<import("./get_apm_timeseries").ApmTimeseriesType.transactionFailureRate>]>;
                }>, t.PartialC<{
                    'transaction.type': t.StringC;
                    'transaction.name': t.StringC;
                }>]>, t.IntersectionC<[t.TypeC<{
                    name: t.UnionC<[t.LiteralC<import("./get_apm_timeseries").ApmTimeseriesType.exitSpanThroughput>, t.LiteralC<import("./get_apm_timeseries").ApmTimeseriesType.exitSpanFailureRate>, t.LiteralC<import("./get_apm_timeseries").ApmTimeseriesType.exitSpanLatency>]>;
                }>, t.PartialC<{
                    'span.destination.service.resource': t.StringC;
                }>]>, t.IntersectionC<[t.TypeC<{
                    name: t.LiteralC<import("./get_apm_timeseries").ApmTimeseriesType.transactionLatency>;
                    function: t.UnionC<[t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                }>, t.PartialC<{
                    'transaction.type': t.StringC;
                    'transaction.name': t.StringC;
                }>]>, t.TypeC<{
                    name: t.LiteralC<import("./get_apm_timeseries").ApmTimeseriesType.errorEventRate>;
                }>]>;
            }>, t.PartialC<{
                filter: t.StringC;
                offset: t.StringC;
                'service.environment': t.StringC;
            }>]>>;
            start: t.StringC;
            end: t.StringC;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        content: Array<Omit<ApmTimeseries, "data">>;
        data: ApmTimeseries[];
    }, import("../typings").APMRouteCreateOptions>;
};
