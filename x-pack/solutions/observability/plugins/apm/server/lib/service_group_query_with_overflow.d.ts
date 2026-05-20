import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ServiceGroup } from '../../common/service_groups';
export declare function serviceGroupWithOverflowQuery(serviceGroup?: ServiceGroup | null): QueryDslQueryContainer[];
