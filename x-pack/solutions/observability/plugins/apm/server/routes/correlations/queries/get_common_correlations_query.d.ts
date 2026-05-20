import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
export declare function getCommonCorrelationsQuery({ start, end, kuery, query, environment, }: CommonCorrelationsQueryParams): QueryDslQueryContainer;
