import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import type { APMError } from '../../../../typings/es_schemas/ui/apm_error';
export interface ErrorSampleDetailsResponse {
    transaction: Transaction | undefined;
    error: Omit<APMError, 'transaction' | 'error'> & {
        transaction?: {
            id?: string;
            type?: string;
        };
        user_agent?: {
            name?: string;
            version?: string;
        };
        error: {
            id: string;
        } & Omit<APMError['error'], 'exception' | 'log'> & {
            exception?: APMError['error']['exception'];
            log?: APMError['error']['log'];
        };
    };
}
export declare function getErrorSampleDetails({ environment, kuery, serviceName, errorId, apmEventClient, start, end, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    errorId: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<Partial<ErrorSampleDetailsResponse>>;
