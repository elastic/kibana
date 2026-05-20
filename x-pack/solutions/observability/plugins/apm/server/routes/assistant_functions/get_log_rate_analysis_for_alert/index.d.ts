import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { fetchLogRateAnalysisForAlert } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
/**
 * Runs log rate analysis data on an index given some alert metadata.
 */
export declare function getLogRateAnalysisForAlert({ esClient, logSourcesService, arguments: args, }: {
    esClient: ElasticsearchClient;
    logSourcesService: LogSourcesService;
    arguments: {
        alertStartedAt: string;
        alertRuleParameterTimeSize?: number;
        alertRuleParameterTimeUnit?: string;
        entities: {
            'service.name'?: string;
            'host.name'?: string;
            'container.id'?: string;
            'kubernetes.pod.name'?: string;
        };
    };
}): ReturnType<typeof fetchLogRateAnalysisForAlert>;
