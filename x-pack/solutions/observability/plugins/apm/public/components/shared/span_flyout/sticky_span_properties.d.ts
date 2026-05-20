import React from 'react';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
interface Props {
    span: Span;
    transaction?: Transaction;
}
export declare function StickySpanProperties({ span, transaction }: Props): React.JSX.Element;
export {};
