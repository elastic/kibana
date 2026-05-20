import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
interface Params {
    profilingDataAccessStart: ProfilingDataAccessPluginStart;
    core: CoreRequestHandlerContext;
    esClient: ElasticsearchClient;
    startIndex: number;
    endIndex: number;
    start: number;
    end: number;
    kuery: string;
    serviceName?: string;
    transactionName?: string;
    environment?: string;
    transactionType?: string;
    indices?: string[];
    stacktraceIdsField?: string;
}
export declare function fetchFunctions({ profilingDataAccessStart, core, esClient, startIndex, endIndex, start, end, kuery, serviceName, transactionName, environment, transactionType, indices, stacktraceIdsField, }: Params): Promise<import("@kbn/profiling-utils").TopNFunctions>;
export {};
