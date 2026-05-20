import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTotalIndicesStats({ context, apmEventClient, }: {
    context: ApmPluginRequestHandlerContext;
    apmEventClient: APMEventClient;
}): Promise<import("@elastic/elasticsearch/lib/api/types").IndicesStatsResponse>;
export declare function getEstimatedSizeForDocumentsInIndex({ allIndicesStats, indexName, numberOfDocs, }: {
    allIndicesStats: Record<string, IndicesStatsIndicesStats>;
    indexName: string;
    numberOfDocs: number;
}): number;
export declare function getApmDiskSpacedUsedPct(context: ApmPluginRequestHandlerContext): Promise<number>;
export declare function getIndicesLifecycleStatus({ context, apmEventClient, }: {
    context: ApmPluginRequestHandlerContext;
    apmEventClient: APMEventClient;
}): Promise<Record<string, import("@elastic/elasticsearch/lib/api/types").IlmExplainLifecycleLifecycleExplain>>;
export declare function getIndicesInfo({ context, apmEventClient, }: {
    context: ApmPluginRequestHandlerContext;
    apmEventClient: APMEventClient;
}): Promise<import("@elastic/elasticsearch/lib/api/types").IndicesGetResponse>;
export declare function getApmIndicesCombined(apmEventClient: APMEventClient): string;
