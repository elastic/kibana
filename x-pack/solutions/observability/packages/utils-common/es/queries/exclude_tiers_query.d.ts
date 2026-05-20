import type { estypes } from '@elastic/elasticsearch';
export declare function excludeTiersQuery(excludedDataTiers: Array<'data_frozen' | 'data_cold' | 'data_warm' | 'data_hot'>): estypes.QueryDslQueryContainer[];
