import React from 'react';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
export interface ChartContainerProps {
    hasData: boolean;
    status: FETCH_STATUS;
    height: number;
    children: React.ReactNode;
    id?: string;
}
export declare function ChartContainer({ children, height, status, hasData, id }: ChartContainerProps): React.JSX.Element;
