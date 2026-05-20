import React from 'react';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
interface Props {
    error?: {
        error: Pick<APMError['error'], 'log' | 'exception' | 'culprit' | 'message'>;
    };
}
export declare function SampleSummary({ error }: Props): React.JSX.Element | null;
export {};
