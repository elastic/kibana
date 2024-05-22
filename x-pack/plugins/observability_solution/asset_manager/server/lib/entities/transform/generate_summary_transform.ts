/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_SUMMARY_BASE_PREFIX } from '../../../../common/constants_entities';
import { generateSummaryMetadataAggregations } from './generate_metadata_aggregations';
import { generateSummaryIngestPipelineId } from '../ingest_pipeline/generate_summary_ingest_pipeline_id';
import { generateSummaryTransformId } from './generate_summary_transform_id';
import { generateHistoryIndexName } from '../helpers/generate_index_name';
import { generateSummaryMetricAggregations } from './generate_metric_aggregations';

export function generateSummaryTransform(
  definition: EntityDefinition
): TransformPutTransformRequest {
  return {
    transform_id: generateSummaryTransformId(definition),
    defer_validation: true,
    source: {
      index: `${generateHistoryIndexName(definition)}.*`,
    },
    dest: {
      index: `${ENTITY_SUMMARY_BASE_PREFIX}.noop`,
      pipeline: generateSummaryIngestPipelineId(definition),
    },
    frequency: definition.summary.settings?.frequency || '30s', // ENTITY_DEFAULT_FREQUENCY,
    sync: {
      time: {
        field: definition.history.settings?.syncField ?? 'event.ingested',
        delay: definition.history.settings?.syncDelay ?? '1s', // ENTITY_DEFAULT_SYNC_DELAY,
      },
    },
    settings: {
      deduce_mappings: false,
      unattended: true,
    },
    pivot: {
      group_by: {
        ['entity.id']: {
          terms: { field: 'entity.id' },
        },
        ['entity.displayName']: {
          terms: { field: 'entity.displayName' },
        },
        ...definition.identityFields.reduce(
          (acc, id) => ({
            ...acc,
            [`entity.identityFields.${id.field}`]: {
              terms: { field: `entity.identityFields.${id.field}`, missing_bucket: id.optional },
            },
          }),
          {}
        ),
      },
      aggs: {
        ...generateSummaryMetricAggregations(definition),
        ...generateSummaryMetadataAggregations(definition),
        'entity.latestTimestamp': {
          max: {
            field: '@timestamp',
          },
        },
        'entity.firstSeenTimestamp': {
          min: {
            field: '@timestamp',
          },
        },
      },
    },
  };
}
