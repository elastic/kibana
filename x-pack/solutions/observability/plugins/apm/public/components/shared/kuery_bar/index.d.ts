import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import React from 'react';
import type { QuerySuggestion } from '@kbn/kql/public';
export declare function KueryBar(props: {
    placeholder?: string;
    boolFilter?: QueryDslQueryContainer[];
    prepend?: React.ReactNode | string;
    onSubmit?: (value: string) => void;
    onChange?: (value: string) => void;
    value?: string;
    suggestionFilter?: (querySuggestion: QuerySuggestion) => boolean;
}): React.JSX.Element;
