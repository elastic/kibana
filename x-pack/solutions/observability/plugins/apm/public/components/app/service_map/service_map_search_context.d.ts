import React from 'react';
import type { BoolQuery } from '@kbn/es-query';
export interface ServiceMapEsQuery {
    bool: BoolQuery;
}
/**
 * `null`      — search bar mounted but hasn't computed the query yet (gate fetch).
 * `undefined` — no search bar provider (embeddable path — don't gate).
 * `object`    — query is ready.
 */
export type ServiceMapEsQueryState = ServiceMapEsQuery | null | undefined;
interface ServiceMapSearchContextValue {
    esQuery: ServiceMapEsQueryState;
    setEsQuery: (q: ServiceMapEsQuery) => void;
}
export declare function ServiceMapSearchProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useServiceMapSearchContext(): ServiceMapSearchContextValue;
export {};
