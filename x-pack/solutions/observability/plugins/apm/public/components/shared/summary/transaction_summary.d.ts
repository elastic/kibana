import React from 'react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
interface Props {
    transaction: Transaction;
    totalDuration: number | undefined;
    errorCount: number;
    coldStartBadge?: boolean;
}
declare function TransactionSummary({ transaction, totalDuration, errorCount, coldStartBadge }: Props): React.JSX.Element;
export { TransactionSummary };
