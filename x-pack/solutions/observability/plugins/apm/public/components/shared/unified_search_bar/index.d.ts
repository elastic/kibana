import React from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare const DEFAULT_REFRESH_INTERVAL = 60000;
export declare function UnifiedSearchBar({ placeholder, value, showDatePicker, showQueryInput, showFilterBar, showSubmitButton, isClearable, boolFilter, }: {
    placeholder?: string;
    value?: string;
    showDatePicker?: boolean;
    showQueryInput?: boolean;
    showFilterBar?: boolean;
    showSubmitButton?: boolean;
    isClearable?: boolean;
    boolFilter?: QueryDslQueryContainer[];
}): React.JSX.Element;
