/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../../../typings/elasticsearch';
import { SignificantTermsScoring } from './scoring_rt';

export function getSignificantTermsAgg({
  fieldNames,
  backgroundFilters,
  backgroundIsSuperset = true,
  scoring = 'percentage',
}: {
  fieldNames: string[];
  backgroundFilters: ESFilter[];
  backgroundIsSuperset?: boolean;
  scoring: SignificantTermsScoring;
}) {
  return fieldNames.reduce((acc, fieldName) => {
    return {
      ...acc,
      [fieldName]: {
        significant_terms: {
          size: 10,
          field: fieldName,
          background_filter: { bool: { filter: backgroundFilters } },

          // indicate whether background is a superset of the foreground
          mutual_information: { background_is_superset: backgroundIsSuperset },

          // different scorings https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-significantterms-aggregation.html#significantterms-aggregation-parameters
          [scoring]: {},
          min_doc_count: 5,
          shard_min_doc_count: 5,
        },
      },
      [`cardinality-${fieldName}`]: {
        cardinality: { field: fieldName },
      },
    };
  }, {} as Record<string, any>);
}

export function formatAggregationResponse(aggs?: Record<string, any>) {
  if (!aggs) {
    return;
  }

  return Object.entries(aggs).reduce((acc, [key, value]) => {
    if (key.startsWith('cardinality-')) {
      if (value.value > 0) {
        const fieldName = key.slice(12);
        acc[fieldName] = {
          ...acc[fieldName],
          cardinality: value.value,
        };
      }
    } else if (value.buckets.length > 0) {
      acc[key] = {
        ...acc[key],
        value,
      };
    }
    return acc;
  }, {} as Record<string, { cardinality: number; value: any }>);
}
