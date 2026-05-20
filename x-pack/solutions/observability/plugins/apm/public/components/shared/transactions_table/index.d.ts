import React from 'react';
interface Props {
    hideTitle?: boolean;
    hideViewTransactionsLink?: boolean;
    numberOfTransactionsPerPage?: number;
    showPerPageOptions?: boolean;
    showMaxTransactionGroupsExceededWarning?: boolean;
    environment: string;
    fixedHeight?: boolean;
    kuery: string;
    start: string;
    end: string;
    saveTableOptionsToUrl?: boolean;
    showSparkPlots?: boolean;
    onLoadTable?: () => void;
}
export declare function TransactionsTable({ fixedHeight, hideViewTransactionsLink, hideTitle, numberOfTransactionsPerPage, showPerPageOptions, showMaxTransactionGroupsExceededWarning, environment, kuery, start, end, saveTableOptionsToUrl, onLoadTable, showSparkPlots, }: Props): React.JSX.Element;
export {};
