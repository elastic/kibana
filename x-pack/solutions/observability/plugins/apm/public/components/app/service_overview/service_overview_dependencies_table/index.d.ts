import type { ReactNode } from 'react';
import React from 'react';
import type { TablesLoadedState } from '../apm_overview';
interface ServiceOverviewDependenciesTableProps {
    fixedHeight?: boolean;
    link?: ReactNode;
    showPerPageOptions?: boolean;
    showSparkPlots?: boolean;
    onLoadTable?: (key: keyof TablesLoadedState) => void;
}
export declare function ServiceOverviewDependenciesTable({ fixedHeight, link, showPerPageOptions, showSparkPlots, onLoadTable, }: ServiceOverviewDependenciesTableProps): React.JSX.Element;
export {};
