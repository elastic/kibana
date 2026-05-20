import React from 'react';
interface ServiceOverviewInstancesChartAndTableProps {
    chartHeight: number;
    serviceName: string;
}
export type SortDirection = 'asc' | 'desc';
export declare const PAGE_SIZE = 5;
export declare function ServiceOverviewInstancesChartAndTable({ chartHeight, serviceName, }: ServiceOverviewInstancesChartAndTableProps): React.JSX.Element;
export {};
