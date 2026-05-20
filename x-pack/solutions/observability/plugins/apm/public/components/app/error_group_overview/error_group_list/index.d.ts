import React from 'react';
interface Props {
    serviceName: string;
    isCompactMode?: boolean;
    initialPageSize: number;
    comparisonEnabled?: boolean;
    saveTableOptionsToUrl?: boolean;
    showPerPageOptions?: boolean;
    onLoadTable?: () => void;
    tableCaption?: string;
}
export declare function ErrorGroupList({ serviceName, isCompactMode, initialPageSize, comparisonEnabled, saveTableOptionsToUrl, showPerPageOptions, onLoadTable, tableCaption, }: Props): React.JSX.Element;
export {};
