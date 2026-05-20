import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare function termsQuery(field: string, ...values: Array<string | boolean | undefined | number | null>): QueryDslQueryContainer[];
