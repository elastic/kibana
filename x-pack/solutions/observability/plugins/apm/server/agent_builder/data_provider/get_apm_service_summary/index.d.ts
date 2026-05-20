import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import type * as t from 'io-ts';
import type { Environment } from '../../../../common/environment_rt';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
export declare const serviceSummaryRouteRt: t.IntersectionC<[t.TypeC<{
    'service.name': t.StringC;
    start: t.StringC;
    end: t.StringC;
}>, t.PartialC<{
    'service.environment': t.StringC;
    'transaction.type': t.StringC;
}>]>;
export interface ServiceSummary {
    'service.name': string;
    'service.environment': string[];
    'agent.name'?: string;
    'service.version'?: string[];
    'language.name'?: string;
    'service.framework'?: string;
    instances: number;
    anomalies: Array<{
        '@timestamp': string;
        metricName: string;
        'service.name': string;
        'service.environment': Environment;
        'transaction.type': string;
        anomalyScore: string | number | null;
        actualValue: number;
        expectedBoundsLower: number;
        expectedBoundsUpper: number;
    }> | {
        error: unknown;
    };
    alerts: Array<{
        type?: string;
        started: string;
    }>;
    deployments: Array<{
        '@timestamp': string;
    }>;
}
export declare function getApmServiceSummary({ arguments: args, apmEventClient, mlClient, esClient, annotationsClient, apmAlertsClient, logger, }: {
    arguments: t.TypeOf<typeof serviceSummaryRouteRt>;
    apmEventClient: APMEventClient;
    mlClient?: MlClient;
    esClient: ElasticsearchClient;
    annotationsClient?: ScopedAnnotationsClient;
    apmAlertsClient: ApmAlertsClient;
    logger: Logger;
}): Promise<ServiceSummary>;
