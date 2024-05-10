/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAMDefinition } from '@kbn/oam-schema';
import {
  QueryDslQueryContainer,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { getElasticsearchQueryOrThrow } from '../helpers/get_elasticsearch_query_or_throw';
import { generateMetricAggregations } from './generate_metric_aggregations';
import { OAM_BASE_PREFIX, OAM_TRANSFORM_PREFIX } from '../../../../common/constants_oam';
import { generateMetadataAggregations } from './generate_metadata_aggregations';

export function generateTransform(definition: OAMDefinition): TransformPutTransformRequest {
  const filter: QueryDslQueryContainer[] = [
    {
      range: {
        [definition.timestampField]: {
          gte: `now-${definition.lookback.toJSON()}`,
        },
      },
    },
  ];

  if (definition.filter) {
    filter.push(getElasticsearchQueryOrThrow(definition.filter));
  }

  return {
    transform_id: `${OAM_TRANSFORM_PREFIX}-${definition.id}`,
    defer_validation: true,
    source: {
      index: definition.indexPatterns,
      query: {
        bool: {
          filter,
        },
      },
    },
    dest: {
      index: `${OAM_BASE_PREFIX}.noop`,
      pipeline: `${OAM_BASE_PREFIX}.${definition.id}`,
    },
    frequency: definition.settings?.frequency || '1m',
    sync: {
      time: {
        field: definition.settings?.syncField ?? definition.timestampField,
        delay: definition.settings?.syncDelay ?? '60s',
      },
    },
    settings: {
      deduce_mappings: false,
      unattended: true,
    },
    pivot: {
      group_by: definition.identityFields.reduce(
        (acc, field) => ({
          ...acc,
          [`asset.identity.${field}`]: { terms: { field } },
        }),
        {}
      ),
      aggs: {
        ...generateMetricAggregations(definition),
        ...generateMetadataAggregations(definition),
        'asset.latestTimestamp': {
          max: {
            field: definition.timestampField,
          },
        },
      },
    },
  };
}
