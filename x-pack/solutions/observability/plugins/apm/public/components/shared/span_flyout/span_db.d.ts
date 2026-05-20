import React from 'react';
import type { Span } from '../../../../typings/es_schemas/ui/span';
interface Props {
    spanDb?: NonNullable<Span['span']>['db'];
}
export declare function SpanDatabase({ spanDb }: Props): React.JSX.Element | null;
export {};
