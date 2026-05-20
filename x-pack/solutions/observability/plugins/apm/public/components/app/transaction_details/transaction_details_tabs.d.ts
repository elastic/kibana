import React from 'react';
import type { XYBrushEvent } from '@elastic/charts';
import type { TraceSamplesFetchResult } from '../../../hooks/use_transaction_trace_samples_fetcher';
export interface TabContentProps {
    clearChartSelection: () => void;
    onFilter: () => void;
    sampleRangeFrom?: number;
    sampleRangeTo?: number;
    selectSampleFromChartSelection: (selection: XYBrushEvent) => void;
    traceSamplesFetchResult: TraceSamplesFetchResult;
}
export declare function TransactionDetailsTabs(): React.JSX.Element;
