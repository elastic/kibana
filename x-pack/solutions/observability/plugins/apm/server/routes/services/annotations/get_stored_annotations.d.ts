import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import type { Annotation } from '../../../../common/annotations';
export declare function getStoredAnnotations({ serviceName, environment, client, annotationsClient, logger, start, end, }: {
    serviceName: string;
    environment: string;
    client: ElasticsearchClient;
    annotationsClient: ScopedAnnotationsClient;
    logger: Logger;
    start: number;
    end: number;
}): Promise<Annotation[]>;
