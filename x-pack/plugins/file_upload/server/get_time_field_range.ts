/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from 'kibana/server';
import { estypes } from '@elastic/elasticsearch';
import { isPopulatedObject } from './utils/runtime_field_utils';

export async function getTimeFieldRange(
  client: IScopedClusterClient,
  index: string[] | string,
  timeFieldName: string,
  query: any,
  runtimeMappings?: estypes.MappingRuntimeFields
): Promise<{
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
}> {
  const obj = { success: true, start: { epoch: 0, string: '' }, end: { epoch: 0, string: '' } };

  const {
    body: { aggregations },
  } = await client.asCurrentUser.search({
    index,
    size: 0,
    body: {
      ...(query ? { query } : {}),
      aggs: {
        earliest: {
          min: {
            field: timeFieldName,
          },
        },
        latest: {
          max: {
            field: timeFieldName,
          },
        },
      },
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    },
  });

  if (aggregations && aggregations.earliest && aggregations.latest) {
    // @ts-expect-error fix search aggregation response
    obj.start.epoch = aggregations.earliest.value;
    // @ts-expect-error fix search aggregation response
    obj.start.string = aggregations.earliest.value_as_string;

    // @ts-expect-error fix search aggregation response
    obj.end.epoch = aggregations.latest.value;
    // @ts-expect-error fix search aggregation response
    obj.end.string = aggregations.latest.value_as_string;
  }
  return obj;
}
