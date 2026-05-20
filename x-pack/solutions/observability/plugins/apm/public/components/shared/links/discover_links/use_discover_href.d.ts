import type { ESQLQueryParams, IndexType } from './get_esql_query';
export declare function useDiscoverHref({ indexType, rangeFrom, rangeTo, queryParams, }: {
    indexType: IndexType;
    rangeFrom: string;
    rangeTo: string;
    queryParams: ESQLQueryParams;
}): string | undefined;
