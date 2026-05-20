import type { Error } from '@kbn/apm-types';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
export declare function getUnprocessedOtelErrors({ logsClient, traceId, docId, start, end, }: {
    logsClient: LogsClient;
    traceId: string;
    docId?: string;
    start: number;
    end: number;
}): Promise<Error[]>;
