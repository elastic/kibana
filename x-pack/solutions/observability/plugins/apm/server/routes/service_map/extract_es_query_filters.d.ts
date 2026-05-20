import type { BoolQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
/**
 * Normalizes the bool clauses from a pre-built ES query into flat arrays.
 *
 * The ES query spec allows `bool.filter`, `bool.must`, and `bool.must_not` to
 * be either a single object or an array. This helper flattens them so
 * consumers can safely spread the results into their own query.
 *
 * `filter` includes both `bool.filter` and `bool.must` clauses (both are
 * ANDed), since the distinction is irrelevant for our use case.
 */
export declare function extractEsQueryFilters(esQuery?: {
    bool: BoolQuery;
}): {
    filter: QueryDslQueryContainer[];
    mustNot: QueryDslQueryContainer[];
};
