import React from 'react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
interface Props {
    readonly transaction?: Transaction;
    isLoading: boolean;
}
export declare function TransactionActionMenu({ transaction, isLoading }: Props): React.JSX.Element;
export {};
