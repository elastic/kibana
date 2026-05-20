import React from 'react';
import type { BoolQuery, Filter } from '@kbn/es-query';
interface AlertsSearchBarContextValue {
    apmFilters: Filter[];
    filterControls: Filter[];
    setFilterControls: React.Dispatch<React.SetStateAction<Filter[]>>;
    esQuery: {
        bool: BoolQuery;
    } | undefined;
    setEsQuery: React.Dispatch<React.SetStateAction<{
        bool: BoolQuery;
    } | undefined>>;
    onKueryChange: (value: any) => void;
}
export declare function useAlertsSearchBarContext(): AlertsSearchBarContextValue;
export declare function AlertsSearchBarContextProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export {};
