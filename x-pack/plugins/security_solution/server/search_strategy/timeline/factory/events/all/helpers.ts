/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has, merge, uniq } from 'lodash/fp';
import { EventHit, TimelineEdges } from '../../../../../../common/search_strategy';
import { toStringArray } from '../../../../helpers/to_array';

export const formatTimelineData = (
  dataFields: readonly string[],
  ecsFields: readonly string[],
  hit: EventHit
) =>
  uniq([...ecsFields, ...dataFields]).reduce<TimelineEdges>(
    (flattenedFields, fieldName) => {
      flattenedFields.node._id = hit._id;
      flattenedFields.node._index = hit._index;
      flattenedFields.node.ecs._id = hit._id;
      flattenedFields.node.ecs.timestamp = hit._source['@timestamp'];
      flattenedFields.node.ecs._index = hit._index;
      if (hit.sort && hit.sort.length > 1) {
        flattenedFields.cursor.value = hit.sort[0];
        flattenedFields.cursor.tiebreaker = hit.sort[1];
      }
      return mergeTimelineFieldsWithHit(fieldName, flattenedFields, hit, dataFields, ecsFields);
    },
    {
      node: { ecs: { _id: '' }, data: [], _id: '', _index: '' },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );

const specialFields = ['_id', '_index', '_type', '_score'];

const mergeTimelineFieldsWithHit = <T>(
  fieldName: string,
  flattenedFields: T,
  hit: { _source: {} },
  dataFields: readonly string[],
  ecsFields: readonly string[]
) => {
  if (fieldName != null || dataFields.includes(fieldName)) {
    const esField = fieldName;
    if (has(esField, hit._source) || specialFields.includes(esField)) {
      const objectWithProperty = {
        node: {
          ...get('node', flattenedFields),
          data: dataFields.includes(fieldName)
            ? [
                ...get('node.data', flattenedFields),
                {
                  field: fieldName,
                  value: specialFields.includes(esField)
                    ? toStringArray(get(esField, hit))
                    : toStringArray(get(esField, hit._source)),
                },
              ]
            : get('node.data', flattenedFields),
          ecs: ecsFields.includes(fieldName)
            ? {
                ...get('node.ecs', flattenedFields),
                // @ts-expect-error
                ...fieldName.split('.').reduceRight(
                  // @ts-expect-error
                  (obj, next) => ({ [next]: obj }),
                  toStringArray<string>(get(esField, hit._source))
                ),
              }
            : get('node.ecs', flattenedFields),
        },
      };
      return merge(flattenedFields, objectWithProperty);
    } else {
      return flattenedFields;
    }
  } else {
    return flattenedFields;
  }
};
