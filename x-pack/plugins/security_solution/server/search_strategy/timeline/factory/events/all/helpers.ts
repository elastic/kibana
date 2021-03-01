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
  hit: EventHit,
  nestedParentFieldName?: string
): Promise<TimelineNonEcsData[]> => {
  if (specialFields.includes(fieldName)) {
    return [{ field: fieldName, value: toStringArray(get(fieldName, hit)) }];
  }

  let fieldToEval;
  if (has(fieldName, hit._source)) {
    fieldToEval = {
      [fieldName]: get(fieldName, hit._source),
    };
  } else {
    if (nestedParentFieldName == null || nestedParentFieldName === fieldName) {
      fieldToEval = {
        [fieldName]: hit.fields[fieldName],
      };
    } else if (nestedParentFieldName != null) {
      fieldToEval = {
        [nestedParentFieldName]: hit.fields[nestedParentFieldName],
      };
    } else {
      // fallback, should never hit
      fieldToEval = {
        [fieldName]: [],
      };
    }
  }
  const formattedData = await getDataSafety(getDataFromFieldsHits, fieldToEval);
  return formattedData.reduce(
    (acc: TimelineNonEcsData[], { field, values }) =>
      // nested fields return all field values, pick only the one we asked for
      field.includes(fieldName) ? [...acc, { field, value: values }] : acc,
    []
  );
};

const mergeTimelineFieldsWithHit = async <T>(
  fieldName: string,
  flattenedFields: T,
  hit: EventHit,
  dataFields: readonly string[],
  ecsFields: readonly string[]
) => {
  if (fieldName != null || dataFields.includes(fieldName)) {
    const fieldNameAsArray = fieldName.split('.');
    const nestedParentFieldName = Object.keys(hit.fields ?? []).find((f) => {
      return f === fieldNameAsArray.slice(0, f.split('.').length).join('.');
    });
    if (
      has(fieldName, hit._source) ||
      has(fieldName, hit.fields) ||
      nestedParentFieldName != null ||
      specialFields.includes(fieldName)
    ) {
      const objectWithProperty = {
        node: {
          ...get('node', flattenedFields),
          data: dataFields.includes(fieldName)
            ? [
                ...get('node.data', flattenedFields),
                ...(await getValuesFromFields(fieldName, hit, nestedParentFieldName)),
              ]
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
      return merge(flattenedFields, objectWithProperty);
    } else {
      return flattenedFields;
    }
  } else {
    return flattenedFields;
  }
};
