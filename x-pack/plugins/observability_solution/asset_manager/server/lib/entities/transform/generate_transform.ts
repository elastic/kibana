/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/oam-schema';
import {
  QueryDslQueryContainer,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { getElasticsearchQueryOrThrow } from '../helpers/get_elasticsearch_query_or_throw';
import { generateMetricAggregations } from './generate_metric_aggregations';
import {
  ENTITY_BASE_PREFIX,
  ENTITY_DEFAULT_FREQUENCY,
  ENTITY_DEFAULT_SYNC_DELAY,
} from '../../../../common/constants_entities';
import { generateMetadataAggregations } from './generate_metadata_aggregations';
import { generateTransformId } from './generate_transform_id';
import { generateIngestPipelineId } from '../ingest_pipeline/generate_ingest_pipeline_id';

export function generateTransform(definition: EntityDefinition): TransformPutTransformRequest {
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
    transform_id: generateTransformId(definition),
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
      index: `${ENTITY_BASE_PREFIX}.noop`,
      pipeline: generateIngestPipelineId(definition),
    },
    frequency: definition.settings?.frequency || ENTITY_DEFAULT_FREQUENCY,
    sync: {
      time: {
        field: definition.settings?.syncField ?? definition.timestampField,
        delay: definition.settings?.syncDelay ?? ENTITY_DEFAULT_SYNC_DELAY,
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
          [`entity.identity.${field}`]: { terms: { field } },
        }),
        {}
      ),
      aggs: {
        ...generateMetricAggregations(definition),
        ...generateMetadataAggregations(definition),
        'entity.latestTimestamp': {
          max: {
            field: definition.timestampField,
          },
        },
      },
    },
  };
}
