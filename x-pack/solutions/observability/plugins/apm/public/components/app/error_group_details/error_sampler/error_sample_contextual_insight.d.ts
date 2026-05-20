import React from 'react';
import type { AT_TIMESTAMP } from '@kbn/apm-types';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
export declare function ErrorSampleContextualInsight({ error, transaction, }: {
    error?: {
        [AT_TIMESTAMP]: string;
        error: Pick<APMError['error'], 'log' | 'exception' | 'id'>;
        service?: {
            name: string;
            environment?: string;
            language?: {
                name?: string;
            };
            runtime?: {
                name?: string;
                version?: string;
            };
        };
    };
    transaction?: {
        transaction: {
            name: string;
        };
    };
}): React.JSX.Element | null;
