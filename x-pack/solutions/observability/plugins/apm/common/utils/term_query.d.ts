import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare function termQuery<T extends string>(field: T, value: string | boolean | number | undefined | null): QueryDslQueryContainer[];
