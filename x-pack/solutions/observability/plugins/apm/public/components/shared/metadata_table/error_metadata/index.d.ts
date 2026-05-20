import React from 'react';
import type { APMError } from '@kbn/apm-types';
import type { AT_TIMESTAMP } from '@kbn/apm-types';
interface Props {
    error: {
        [AT_TIMESTAMP]: string;
        error: Pick<APMError['error'], 'id'>;
    };
}
export declare function ErrorMetadata({ error }: Props): React.JSX.Element;
export {};
