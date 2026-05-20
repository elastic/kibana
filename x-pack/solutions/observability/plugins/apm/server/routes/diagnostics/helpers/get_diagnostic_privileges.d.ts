import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getDiagnosticsPrivileges({ esClient, apmIndices, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
}): Promise<{
    index: Record<string, import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesPrivileges>;
    cluster: Record<string, boolean>;
    hasAllIndexPrivileges: boolean;
    hasAllClusterPrivileges: boolean;
    hasAllPrivileges: boolean;
}>;
