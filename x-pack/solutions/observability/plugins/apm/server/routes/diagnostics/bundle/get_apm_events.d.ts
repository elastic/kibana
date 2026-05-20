import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export interface ApmEvent {
    legacy?: boolean;
    name: string;
    kuery: string;
    index: string[];
    docCount: number;
    intervals?: Record<string, {
        metricDocCount: number;
        eventDocCount: number;
    }>;
}
export declare function getApmEvents({ esClient, apmIndices, start, end, kuery, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
    start: number;
    end: number;
    kuery?: string;
}): Promise<ApmEvent[]>;
