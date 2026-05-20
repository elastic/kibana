import React from 'react';
import type { ESQLQueryParams } from './get_esql_query';
type DiscoverButtonVariant = 'button' | 'emptyButton' | 'iconButton' | 'link';
interface OpenInDiscoverProps {
    dataTestSubj: string;
    label: string;
    variant: DiscoverButtonVariant;
    indexType: 'traces' | 'error';
    rangeFrom: string;
    rangeTo: string;
    queryParams: ESQLQueryParams;
}
export declare function OpenInDiscover({ dataTestSubj, label, variant, indexType, rangeFrom, rangeTo, queryParams, }: OpenInDiscoverProps): React.JSX.Element;
export {};
