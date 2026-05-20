import React from 'react';
import { type SavedSearchTableConfig } from '@kbn/saved-search-component';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { type UnifiedWaterfallFetcherResult } from '../use_unified_waterfall_fetcher';
export declare enum TransactionTab {
    timeline = "timeline",
    metadata = "metadata",
    logs = "logs"
}
interface Props {
    transaction?: Transaction;
    isLoading: boolean;
    detailTab?: TransactionTab;
    serviceName?: string;
    waterfallItemId?: string;
    onTabClick: (tab: TransactionTab) => void;
    showCriticalPath: boolean;
    onShowCriticalPathChange: (showCriticalPath: boolean) => void;
    logsTableConfig?: SavedSearchTableConfig;
    onLogsTableConfigChange?: (config: SavedSearchTableConfig) => void;
    unifiedWaterfallFetchResult: UnifiedWaterfallFetcherResult;
    entryTransactionId?: string;
}
export declare function TransactionTabs({ transaction, isLoading, detailTab, waterfallItemId, serviceName, onTabClick, showCriticalPath, onShowCriticalPathChange, logsTableConfig, onLogsTableConfigChange, unifiedWaterfallFetchResult, entryTransactionId, }: Props): React.JSX.Element;
export {};
