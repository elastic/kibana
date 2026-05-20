import React from 'react';
import type { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/transaction';
import type { TraceItem } from '../../../../../common/waterfall/unified_trace_item';
export declare function MaybeViewTraceLink({ isLoading, transaction, traceItems, onViewFullTrace, }: {
    isLoading: boolean;
    transaction?: ITransaction;
    traceItems?: TraceItem[];
    onViewFullTrace: () => void;
}): React.JSX.Element;
