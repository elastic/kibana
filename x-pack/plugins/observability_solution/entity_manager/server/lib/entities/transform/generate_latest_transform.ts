/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITY_DEFAULT_LATEST_FREQUENCY,
  ENTITY_DEFAULT_LATEST_SYNC_DELAY,
} from '../../../../common/constants_entities';
import { generateLatestMetadataAggregations } from './generate_metadata_aggregations';
import {
  generateHistoryIndexName,
  generateLatestTransformId,
  generateLatestIngestPipelineId,
  generateLatestIndexName,
} from '../helpers/generate_component_id';
import { generateLatestMetricAggregations } from './generate_metric_aggregations';

export function generateLatestTransform(
  definition: EntityDefinition
): TransformPutTransformRequest {
  return {
    transform_id: generateLatestTransformId(definition),
    _meta: {
      definitionVersion: definition.version,
    },
    defer_validation: true,
    source: {
      index: `${generateHistoryIndexName(definition)}.*`,
    },
    dest: {
      index: `${generateLatestIndexName({ id: 'noop' } as EntityDefinition)}`,
      pipeline: generateLatestIngestPipelineId(definition),
    },
    frequency: definition.latest?.settings?.frequency ?? ENTITY_DEFAULT_LATEST_FREQUENCY,
    sync: {
      time: {
        field: definition.latest?.settings?.syncField ?? 'event.ingested',
        delay: definition.latest?.settings?.syncDelay ?? ENTITY_DEFAULT_LATEST_SYNC_DELAY,
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
          terms: { field: 'entity.displayName.keyword' },
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
        ...generateLatestMetricAggregations(definition),
        ...generateLatestMetadataAggregations(definition),
        'entity.lastSeenTimestamp': {
          max: {
            field: 'entity.lastSeenTimestamp',
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
