import type { XYBrushEvent } from '@elastic/charts';
import React from 'react';
import type { TraceSamplesFetchResult } from '../../../../hooks/use_transaction_trace_samples_fetcher';
interface TransactionDistributionProps {
    onChartSelection: (event: XYBrushEvent) => void;
    onClearSelection: () => void;
    selection?: [number, number];
    traceSamplesFetchResult: TraceSamplesFetchResult;
}
export declare function TransactionDistribution({ onChartSelection, onClearSelection, selection, traceSamplesFetchResult, }: TransactionDistributionProps): React.JSX.Element;
export {};
