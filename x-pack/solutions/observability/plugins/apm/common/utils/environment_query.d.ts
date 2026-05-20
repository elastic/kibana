import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare function environmentQuery(environment: string | undefined, field?: string): QueryDslQueryContainer[];
export declare function serviceNodeNameQuery(serviceNodeName?: string): QueryDslQueryContainer[];
