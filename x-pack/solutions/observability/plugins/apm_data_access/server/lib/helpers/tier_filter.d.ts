import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
export declare function getDataTierFilterCombined({ filter, excludedDataTiers, }: {
    filter?: QueryDslQueryContainer;
    excludedDataTiers?: DataTier[];
}): QueryDslQueryContainer | undefined;
