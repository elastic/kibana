import React from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimeRangeMetadata } from '../../../common/time_range_metadata';
import type { FetcherResult } from '../../hooks/use_fetcher';
export declare const TimeRangeMetadataContext: React.Context<FetcherResult<TimeRangeMetadata> | undefined>;
export declare function ApmTimeRangeMetadataContextProvider({ children }: {
    children?: React.ReactNode;
}): React.JSX.Element;
export declare function TimeRangeMetadataContextProvider({ children, uiSettings, useSpanName, start, end, kuery, }: {
    children?: React.ReactNode;
    uiSettings: IUiSettingsClient;
    useSpanName: boolean;
    start: string;
    end: string;
    kuery: string;
}): React.JSX.Element;
