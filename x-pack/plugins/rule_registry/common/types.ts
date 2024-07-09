/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import * as t from 'io-ts';

import type { IFieldSubType } from '@kbn/es-query';
import type { RuntimeField } from '@kbn/data-views-plugin/common';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

// note: these schemas are not exhaustive. See the `Sort` type of `@elastic/elasticsearch` if you need to enhance it.
const fieldSchema = t.string;
export const sortOrderSchema = t.union([t.literal('asc'), t.literal('desc'), t.literal('_doc')]);
type SortOrderSchema = 'asc' | 'desc' | '_doc';
const sortModeSchema = t.union([
  t.literal('min'),
  t.literal('max'),
  t.literal('sum'),
  t.literal('avg'),
  t.literal('median'),
]);
const fieldSortSchema = t.exact(
  t.partial({
    missing: t.union([t.string, t.number, t.boolean]),
    mode: sortModeSchema,
    order: sortOrderSchema,
    // nested and unmapped_type not implemented yet
  })
);
const sortContainerSchema = t.record(t.string, t.union([sortOrderSchema, fieldSortSchema]));
const sortCombinationsSchema = t.union([fieldSchema, sortContainerSchema]);
export const sortSchema = t.union([sortCombinationsSchema, t.array(sortCombinationsSchema)]);

export const minDocCount = t.number;

interface BucketAggsSchemas {
  filter?: {
    term?: { [x: string]: string | boolean | number };
  };
  histogram?: {
    field?: string;
    interval?: number;
    min_doc_count?: number;
    extended_bounds?: {
      min: number;
      max: number;
    };
    hard_bounds?: {
      min: number;
      max: number;
    };
    missing?: number;
    keyed?: boolean;
    order?: {
      _count: string;
      _key: string;
    };
  };
  nested?: {
    path: string;
  };
  terms?: {
    field?: string;
    collect_mode?: string;
    exclude?: string | string[];
    include?: string | string[];
    execution_hint?: string;
    missing?: number | string;
    min_doc_count?: number;
    size?: number;
    show_term_doc_count_error?: boolean;
    order?:
      | SortOrderSchema
      | { [x: string]: SortOrderSchema }
      | Array<{ [x: string]: SortOrderSchema }>;
  };
  aggs?: BucketAggsSchemas;
  aggregations?: BucketAggsSchemas;
}

/**
 * Schemas for the Bucket aggregations.
 *
 * Currently supported:
 * - filter
 * - histogram
 * - nested
 * - terms
 *
 * Not implemented:
 * - adjacency_matrix
 * - auto_date_histogram
 * - children
 * - composite
 * - date_histogram
 * - date_range
 * - diversified_sampler
 * - filters
 * - geo_distance
 * - geohash_grid
 * - geotile_grid
 * - global
 * - ip_range
 * - missing
 * - multi_terms
 * - parent
 * - range
 * - rare_terms
 * - reverse_nested
 * - sampler
 * - significant_terms
 * - significant_text
 * - variable_width_histogram
 */
const bucketAggsTempsSchemas: t.Type<BucketAggsSchemas> = t.exact(
  t.partial({
    filter: t.exact(
      t.partial({
        term: t.record(t.string, t.union([t.string, t.boolean, t.number])),
      })
    ),
    date_histogram: t.exact(
      t.partial({
        field: t.string,
        fixed_interval: t.string,
        min_doc_count: t.number,
        extended_bounds: t.type({
          min: t.string,
          max: t.string,
        }),
      })
    ),
    histogram: t.exact(
      t.partial({
        field: t.string,
        interval: t.number,
        min_doc_count: t.number,
        extended_bounds: t.exact(
          t.type({
            min: t.number,
            max: t.number,
          })
        ),
        hard_bounds: t.exact(
          t.type({
            min: t.number,
            max: t.number,
          })
        ),
        missing: t.number,
        keyed: t.boolean,
        order: t.exact(
          t.type({
            _count: t.string,
            _key: t.string,
          })
        ),
      })
    ),
    nested: t.type({
      path: t.string,
    }),
    multi_terms: t.exact(
      t.partial({
        terms: t.array(t.type({ field: t.string })),
        collect_mode: t.string,
        min_doc_count: t.number,
        shard_min_doc_count: t.number,
        size: t.number,
        shard_size: t.number,
        show_term_doc_count_error: t.boolean,
        order: t.union([
          sortOrderSchema,
          t.record(t.string, sortOrderSchema),
          t.array(t.record(t.string, sortOrderSchema)),
        ]),
      })
    ),
    terms: t.exact(
      t.partial({
        field: t.string,
        collect_mode: t.string,
        exclude: t.union([t.string, t.array(t.string)]),
        include: t.union([t.string, t.array(t.string)]),
        execution_hint: t.string,
        missing: t.union([t.number, t.string]),
        min_doc_count: t.number,
        size: t.number,
        show_term_doc_count_error: t.boolean,
        order: t.union([
          sortOrderSchema,
          t.record(t.string, sortOrderSchema),
          t.array(t.record(t.string, sortOrderSchema)),
        ]),
      })
    ),
    bucket_sort: t.exact(
      t.partial({
        sort: sortSchema,
        from: t.number,
        size: t.number,
        gap_policy: t.union([
          t.literal('skip'),
          t.literal('insert_zeros'),
          t.literal('keep_values'),
        ]),
      })
    ),
    value_count: t.exact(
      t.partial({
        field: t.string,
      })
    ),
  })
);

/**
 * Schemas for the metrics Aggregations
 *
 * Currently supported:
 * - avg
 * - cardinality
 * - min
 * - max
 * - sum
 * - top_hits
 * - weighted_avg
 *
 * Not implemented:
 * - boxplot
 * - extended_stats
 * - geo_bounds
 * - geo_centroid
 * - geo_line
 * - matrix_stats
 * - median_absolute_deviation
 * - percentile_ranks
 * - percentiles
 * - rate
 * - scripted_metric
 * - stats
 * - string_stats
 * - t_test
 * - value_count
 */
export const metricsAggsSchemas = t.exact(
  t.partial({
    avg: t.exact(
      t.partial({
        field: t.string,
        missing: t.union([t.string, t.number, t.boolean]),
      })
    ),
    cardinality: t.exact(
      t.partial({
        field: t.string,
        precision_threshold: t.number,
        rehash: t.boolean,
        missing: t.union([t.string, t.number, t.boolean]),
      })
    ),
    min: t.exact(
      t.partial({
        field: t.string,
        missing: t.union([t.string, t.number, t.boolean]),
        format: t.string,
      })
    ),
    max: t.exact(
      t.partial({
        field: t.string,
        missing: t.union([t.string, t.number, t.boolean]),
        format: t.string,
      })
    ),
    sum: t.exact(
      t.partial({
        field: t.string,
        missing: t.union([t.string, t.number, t.boolean]),
      })
    ),
    top_hits: t.exact(
      t.partial({
        explain: t.boolean,
        docvalue_fields: t.union([t.string, t.array(t.string)]),
        stored_fields: t.union([t.string, t.array(t.string)]),
        from: t.number,
        size: t.number,
        sort: sortSchema,
        seq_no_primary_term: t.boolean,
        version: t.boolean,
        track_scores: t.boolean,
        highlight: t.any,
        _source: t.union([t.boolean, t.string, t.array(t.string)]),
      })
    ),
    weighted_avg: t.exact(
      t.partial({
        format: t.string,
        value_type: t.string,
        value: t.partial({
          field: t.string,
          missing: t.number,
        }),
        weight: t.partial({
          field: t.string,
          missing: t.number,
        }),
      })
    ),
  })
);

export const bucketAggsSchemas = t.intersection([
  bucketAggsTempsSchemas,
  t.exact(
    t.partial({
      aggs: t.record(t.string, t.intersection([bucketAggsTempsSchemas, metricsAggsSchemas])),
      aggregations: t.record(
        t.string,
        t.intersection([bucketAggsTempsSchemas, metricsAggsSchemas])
      ),
    })
  ),
]);

export const alertsAggregationsSchema = t.record(
  t.string,
  t.intersection([metricsAggsSchemas, bucketAggsSchemas])
);

const allowedFilterKeysSchema = t.union([
  t.literal('bool'),
  t.literal('boosting'),
  t.literal('common'),
  t.literal('combined_fields'),
  t.literal('constant_score'),
  t.literal('dis_max'),
  t.literal('distance_feature'),
  t.literal('exists'),
  t.literal('function_score'),
  t.literal('fuzzy'),
  t.literal('geo_bounding_box'),
  t.literal('geo_distance'),
  t.literal('geo_polygon'),
  t.literal('geo_shape'),
  t.literal('has_child'),
  t.literal('has_parent'),
  t.literal('ids'),
  t.literal('intervals'),
  t.literal('knn'),
  t.literal('match'),
  t.literal('match_all'),
  t.literal('match_bool_prefix'),
  t.literal('match_none'),
  t.literal('match_phrase'),
  t.literal('match_phrase_prefix'),
  t.literal('more_like_this'),
  t.literal('multi_match'),
  t.literal('nested'),
  t.literal('parent_id'),
  t.literal('percolate'),
  t.literal('pinned'),
  t.literal('prefix'),
  t.literal('query_string'),
  t.literal('range'),
  t.literal('rank_feature'),
  t.literal('regexp'),
  t.literal('rule_query'),
  t.literal('shape'),
  t.literal('simple_query_string'),
  t.literal('span_containing'),
  t.literal('span_field_masking'),
  t.literal('span_first'),
  t.literal('span_multi'),
  t.literal('span_near'),
  t.literal('span_not'),
  t.literal('span_or'),
  t.literal('span_term'),
  t.literal('span_within'),
  t.literal('term'),
  t.literal('terms'),
  t.literal('terms_set'),
  t.literal('text_expansion'),
  t.literal('weighted_tokens'),
  t.literal('wildcard'),
  t.literal('wrapper'),
  t.literal('type'),
]);

type AssertAssignable<T, U extends T> = T;

// Used to check that the validation schema is aligned with the type from ES
declare type _ = AssertAssignable<
  keyof Omit<QueryDslQueryContainer, 'script' | 'script_score'>,
  t.TypeOf<typeof allowedFilterKeysSchema>
>;

export const alertsGroupFilterSchema = t.record(allowedFilterKeysSchema, t.any);

export type PutIndexTemplateRequest = estypes.IndicesPutIndexTemplateRequest & {
  body?: { composed_of?: string[] };
};

export interface ClusterPutComponentTemplateBody {
  template: {
    settings: {
      number_of_shards: number;
      'index.mapping.total_fields.limit'?: number;
    };
    mappings: estypes.MappingTypeMapping;
  };
}

export interface BrowserField {
  aggregatable: boolean;
  category: string;
  description?: string | null;
  example?: string | number | null;
  fields: Readonly<Record<string, Partial<BrowserField>>>;
  format?: string;
  indexes: string[];
  name: string;
  searchable: boolean;
  type: string;
  subType?: IFieldSubType;
  readFromDocValues: boolean;
  runtimeField?: RuntimeField;
}

export type BrowserFields = Record<string, Partial<BrowserField>>;
