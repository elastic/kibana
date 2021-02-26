/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has, merge, uniq } from 'lodash/fp';
import {
  EventHit,
  TimelineEdges,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy';
import { toStringArray } from '../../../../helpers/to_array';
import { getDataSafety, getDataFromFieldsHits } from '../details/helpers';

const getTimestamp = (hit: EventHit): string => {
  if (hit.fields && hit.fields['@timestamp']) {
    return `${hit.fields['@timestamp'][0] ?? ''}`;
  } else if (hit._source && hit._source['@timestamp']) {
    return hit._source['@timestamp'];
  }
  return '';
};

export const formatTimelineData = async (
  dataFields: readonly string[],
  ecsFields: readonly string[],
  hit: EventHit
) =>
  uniq([...ecsFields, ...dataFields]).reduce<Promise<TimelineEdges>>(
    async (acc, fieldName) => {
      const flattenedFields: TimelineEdges = await acc;
      flattenedFields.node._id = hit._id;
      flattenedFields.node._index = hit._index;
      flattenedFields.node.ecs._id = hit._id;
      flattenedFields.node.ecs.timestamp = getTimestamp(hit);
      flattenedFields.node.ecs._index = hit._index;
      if (hit.sort && hit.sort.length > 1) {
        flattenedFields.cursor.value = hit.sort[0];
        flattenedFields.cursor.tiebreaker = hit.sort[1];
      }
      const waitForIt = await mergeTimelineFieldsWithHit(
        fieldName,
        flattenedFields,
        hit,
        dataFields,
        ecsFields
      );
      return Promise.resolve(waitForIt);
    },
    Promise.resolve({
      node: { ecs: { _id: '' }, data: [], _id: '', _index: '' },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    })
  );

const specialFields = ['_id', '_index', '_type', '_score'];

const getValuesFromFields = async (
  fieldName: string,
  hit: EventHit
): Promise<TimelineNonEcsData[]> => {
  if (specialFields.includes(fieldName)) {
    return [{ field: fieldName, value: toStringArray(get(fieldName, hit)) }];
  }
  const fieldToEval = has(fieldName, hit._source)
    ? get(fieldName, hit._source)
    : hit.fields[fieldName];
  const formattedData = await getDataSafety(getDataFromFieldsHits, {
    [fieldName]: fieldToEval,
  });
  return formattedData.map(({ field, values }) => ({ field, value: values }));
};

const mergeTimelineFieldsWithHit = async <T>(
  fieldName: string,
  flattenedFields: T,
  hit: EventHit,
  dataFields: readonly string[],
  ecsFields: readonly string[]
) => {
  if (fieldName != null || dataFields.includes(fieldName)) {
    // console.log('fieldName', fieldName);
    if (
      has(fieldName, hit._source) ||
      has(fieldName, hit.fields) ||
      specialFields.includes(fieldName)
    ) {
      const objectWithProperty = {
        node: {
          ...get('node', flattenedFields),
          data: dataFields.includes(fieldName)
            ? [...get('node.data', flattenedFields), ...(await getValuesFromFields(fieldName, hit))]
            : get('node.data', flattenedFields),
          ecs: ecsFields.includes(fieldName)
            ? {
                ...get('node.ecs', flattenedFields),
                // @ts-expect-error
                ...fieldName.split('.').reduceRight(
                  // @ts-expect-error
                  (obj, next) => ({ [next]: obj }),
                  toStringArray(
                    has(fieldName, hit._source)
                      ? get(fieldName, hit._source)
                      : hit.fields[fieldName]
                  )
                ),
              }
            : get('node.ecs', flattenedFields),
        },
      };
      // console.log('DATA!!!', {
      //   flattenedFields: flattenedFields.node.data,
      //   objectWithProperty: objectWithProperty.node.data,
      // });
      return merge(flattenedFields, objectWithProperty);
    } else {
      if (fieldName.includes('threat.indicator')) {
        console.log('threat.indicator flattenedFields!!!', flattenedFields.node.data);
      }
      return flattenedFields;
    }
  } else {
    return flattenedFields;
  }
};
