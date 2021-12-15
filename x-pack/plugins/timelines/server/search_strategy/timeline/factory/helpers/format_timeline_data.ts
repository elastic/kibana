/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has, merge, uniq } from 'lodash/fp';
import { EventHit, TimelineEdges, TimelineNonEcsData } from '../../../../../common/search_strategy';
import { toStringArray } from '../../../../../common/utils/to_array';
import { getDataFromFieldsHits, getDataSafety } from '../../../../../common/utils/field_formatters';
import { getTimestamp } from './get_timestamp';
import { getNestedParentPath } from './get_nested_parent_path';
import { buildObjectForFieldPath } from './build_object_for_field_path';
import { ECS_METADATA_FIELDS } from './constants';

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

const getValuesFromFields = async (
  fieldName: string,
  hit: EventHit,
  nestedParentFieldName?: string
): Promise<TimelineNonEcsData[]> => {
  if (ECS_METADATA_FIELDS.includes(fieldName)) {
    return [{ field: fieldName, value: toStringArray(get(fieldName, hit)) }];
  }

  let fieldToEval;
  if (has(fieldName, hit._source)) {
    fieldToEval = {
      [fieldName]: get(fieldName, hit._source),
    };
  } else {
    if (nestedParentFieldName == null) {
      fieldToEval = {
        [fieldName]: hit.fields[fieldName],
      };
    } else {
      fieldToEval = {
        [nestedParentFieldName]: hit.fields[nestedParentFieldName],
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
  if (fieldName != null) {
    const nestedParentPath = getNestedParentPath(fieldName, hit.fields);
    if (
      nestedParentPath != null ||
      has(fieldName, hit._source) ||
      has(fieldName, hit.fields) ||
      ECS_METADATA_FIELDS.includes(fieldName)
    ) {
      const objectWithProperty = {
        node: {
          ...get('node', flattenedFields),
          data: dataFields.includes(fieldName)
            ? [
                ...get('node.data', flattenedFields),
                ...(await getValuesFromFields(fieldName, hit, nestedParentPath)),
              ]
            : get('node.data', flattenedFields),
          ecs: ecsFields.includes(fieldName)
            ? {
                ...get('node.ecs', flattenedFields),
                ...buildObjectForFieldPath(fieldName, hit),
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
