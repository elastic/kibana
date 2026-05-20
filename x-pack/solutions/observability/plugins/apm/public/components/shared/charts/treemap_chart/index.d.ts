import React from 'react';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
type DataType = Array<{
    label: string;
    count: number;
}>;
export declare function TreemapChart({ data, height, fetchStatus, id, }: {
    data: DataType;
    height: number;
    fetchStatus: FETCH_STATUS;
    id: string;
}): React.JSX.Element;
export {};
