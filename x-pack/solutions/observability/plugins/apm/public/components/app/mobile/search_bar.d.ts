import React from 'react';
interface Props {
    hidden?: boolean;
    showUnifiedSearchBar?: boolean;
    showFilterBar?: boolean;
    showTimeComparison?: boolean;
    showTransactionTypeSelector?: boolean;
    showQueryInput?: boolean;
    showMobileFilters?: boolean;
    searchBarPlaceholder?: string;
}
export declare function MobileSearchBar({ hidden, showUnifiedSearchBar, showFilterBar, showTimeComparison, showTransactionTypeSelector, showQueryInput, showMobileFilters, searchBarPlaceholder, }: Props): React.JSX.Element | null;
export {};
