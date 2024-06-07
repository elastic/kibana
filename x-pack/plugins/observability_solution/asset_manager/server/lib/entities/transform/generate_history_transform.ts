/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import {
  QueryDslQueryContainer,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { getElasticsearchQueryOrThrow } from '../helpers/get_elasticsearch_query_or_throw';
import { generateHistoryMetricAggregations } from './generate_metric_aggregations';
import {
  ENTITY_DEFAULT_HISTORY_FREQUENCY,
  ENTITY_DEFAULT_HISTORY_SYNC_DELAY,
  ENTITY_HISTORY_BASE_PREFIX,
} from '../../../../common/constants_entities';
import { generateHistoryMetadataAggregations } from './generate_metadata_aggregations';
import { generateHistoryTransformId } from './generate_history_transform_id';
import { generateHistoryIngestPipelineId } from '../ingest_pipeline/generate_history_ingest_pipeline_id';

export function generateHistoryTransform(
  definition: EntityDefinition
): TransformPutTransformRequest {
  const filter: QueryDslQueryContainer[] = [];

  if (definition.filter) {
    filter.push(getElasticsearchQueryOrThrow(definition.filter));
  }

  return {
    transform_id: generateHistoryTransformId(definition),
    defer_validation: true,
    source: {
      index: definition.indexPatterns,
      ...(filter.length > 0 && {
        query: {
          bool: {
            filter,
          },
        },
      }),
    },
    dest: {
      index: `${ENTITY_HISTORY_BASE_PREFIX}.noop`,
      pipeline: generateHistoryIngestPipelineId(definition),
    },
    frequency: definition.history.settings?.frequency ?? ENTITY_DEFAULT_HISTORY_FREQUENCY,
    sync: {
      time: {
        field: definition.history.settings?.syncField ?? definition.history.timestampField,
        delay: definition.history.settings?.syncDelay ?? ENTITY_DEFAULT_HISTORY_SYNC_DELAY,
      },
    },
    settings: {
      deduce_mappings: false,
      unattended: true,
    },
    pivot: {
      group_by: {
        ...definition.identityFields.reduce(
          (acc, id) => ({
            ...acc,
            [`entity.identityFields.${id.field}`]: {
              terms: { field: id.field, missing_bucket: id.optional },
            },
          }),
          {}
        ),
        ['@timestamp']: {
          date_histogram: {
            field: definition.history.timestampField,
            fixed_interval: definition.history.interval.toJSON(),
          },
        },
      },
      aggs: {
        ...generateHistoryMetricAggregations(definition),
        ...generateHistoryMetadataAggregations(definition),
        'entity.lastSeenTimestamp': {
          max: {
            field: definition.history.timestampField,
          },
        },
      },
    },
  };
}
