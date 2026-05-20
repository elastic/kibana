import React from 'react';
import type { UrlParams } from './types';
export interface TimeRange {
    rangeFrom: string;
    rangeTo: string;
}
declare const UrlParamsContext: React.Context<{
    rangeId: number;
    refreshTimeRange: (_time: TimeRange) => void;
    urlParams: UrlParams;
}>;
declare const UrlParamsProvider: React.ComponentClass<{}>;
export { UrlParamsContext, UrlParamsProvider };
