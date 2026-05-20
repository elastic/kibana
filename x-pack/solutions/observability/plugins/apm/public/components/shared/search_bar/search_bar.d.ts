import React from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
interface Props {
    hidden?: boolean;
    showUnifiedSearchBar?: boolean;
    showFilterBar?: boolean;
    showTimeComparison?: boolean;
    showEnvironmentFilter?: boolean;
    showQueryInput?: boolean;
    showTransactionTypeSelector?: boolean;
    searchBarPlaceholder?: string;
    searchBarBoolFilter?: QueryDslQueryContainer[];
}
export declare function SearchBar({ hidden, showUnifiedSearchBar, showFilterBar, showTimeComparison, showEnvironmentFilter, showTransactionTypeSelector, showQueryInput, searchBarPlaceholder, searchBarBoolFilter, }: Props): React.JSX.Element | null;
export {};
