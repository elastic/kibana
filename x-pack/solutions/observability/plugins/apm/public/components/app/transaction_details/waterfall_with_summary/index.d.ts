import React from 'react';
import type { SavedSearchTableConfig } from '@kbn/saved-search-component';
import type { TransactionTab } from './transaction_tabs';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { UnifiedWaterfallFetcherResult } from '../use_unified_waterfall_fetcher';
interface Props<TSample extends {}> {
    traceSamples?: TSample[];
    traceSamplesFetchStatus: FETCH_STATUS;
    onSampleClick: (sample: TSample) => void;
    onTabClick: (tab: TransactionTab) => void;
    serviceName?: string;
    waterfallItemId?: string;
    detailTab?: TransactionTab;
    showCriticalPath: boolean;
    onShowCriticalPathChange: (showCriticalPath: boolean) => void;
    selectedSample?: TSample | null;
    logsTableConfig?: SavedSearchTableConfig;
    onLogsTableConfigChange?: (config: SavedSearchTableConfig) => void;
    unifiedWaterfallFetchResult: UnifiedWaterfallFetcherResult;
    entryTransactionId?: string;
    rangeFrom: string;
    rangeTo: string;
    traceId?: string;
}
export declare function WaterfallWithSummary<TSample extends {}>({ traceSamples, traceSamplesFetchStatus, onSampleClick, onTabClick, serviceName, waterfallItemId, detailTab, showCriticalPath, onShowCriticalPathChange, selectedSample, logsTableConfig, onLogsTableConfigChange, unifiedWaterfallFetchResult, entryTransactionId, rangeFrom, rangeTo, traceId, }: Props<TSample>): React.JSX.Element;
export {};
