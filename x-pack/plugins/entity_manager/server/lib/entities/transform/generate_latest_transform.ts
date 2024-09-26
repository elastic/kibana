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
import { generateLatestMetricAggregations } from './generate_metric_aggregations';
import {
  ENTITY_DEFAULT_LATEST_FREQUENCY,
  ENTITY_DEFAULT_LATEST_SYNC_DELAY,
} from '../../../../common/constants_entities';
import {
  generateLatestTransformId,
  generateLatestIngestPipelineId,
  generateLatestIndexName,
} from '../helpers/generate_component_id';
import { generateLatestMetadataAggregations } from './generate_metadata_aggregations';

export function generateLatestTransform(
  definition: EntityDefinition
): TransformPutTransformRequest {
  const filter: QueryDslQueryContainer[] = [];

  if (definition.filter) {
    filter.push(getElasticsearchQueryOrThrow(definition.filter));
  }

  if (definition.identityFields.some(({ optional }) => !optional)) {
    definition.identityFields
      .filter(({ optional }) => !optional)
      .forEach(({ field }) => {
        filter.push({ exists: { field } });
      });
  }

  filter.push({
    range: {
      [definition.latest.timestampField]: {
        gte: `now-${definition.latest.lookbackPeriod}`,
      },
    },
  });

  return generateTransformPutRequest({
    definition,
    filter,
    transformId: generateLatestTransformId(definition),
    frequency: definition.latest.settings?.frequency ?? ENTITY_DEFAULT_LATEST_FREQUENCY,
    syncDelay: definition.latest.settings?.syncDelay ?? ENTITY_DEFAULT_LATEST_SYNC_DELAY,
  });
}

const generateTransformPutRequest = ({
  definition,
  filter,
  transformId,
  frequency,
  syncDelay,
}: {
  definition: EntityDefinition;
  transformId: string;
  filter: QueryDslQueryContainer[];
  frequency: string;
  syncDelay: string;
}) => {
  return {
    transform_id: transformId,
    _meta: {
      definitionVersion: definition.version,
      managed: definition.managed,
    },
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
      index: `${generateLatestIndexName({ id: 'noop' } as EntityDefinition)}`,
      pipeline: generateLatestIngestPipelineId(definition),
    },
    frequency,
    sync: {
      time: {
        field: definition.latest.settings?.syncField || definition.latest.timestampField,
        delay: syncDelay,
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
            [`entity.identity.${id.field}`]: {
              terms: { field: id.field, missing_bucket: id.optional },
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
            field: definition.latest.timestampField,
          },
        },
      },
    },
  };
};
