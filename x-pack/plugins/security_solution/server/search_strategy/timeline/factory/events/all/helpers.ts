/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { get, has, merge, uniq } from 'lodash/fp';
import { Ecs } from '../../../../../../common/ecs';
import {
  EventHit,
  Fields,
  TimelineEdges,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy';
import { toStringArray } from '../../../../../../common/utils/to_array';
import {
  getDataFromFieldsHits,
  getDataSafety,
} from '../../../../../../common/utils/field_formatters';
import { TIMELINE_EVENTS_FIELDS } from './constants';

const getTimestamp = (hit: EventHit): string => {
  if (hit.fields && hit.fields['@timestamp']) {
    return `${hit.fields['@timestamp'][0] ?? ''}`;
  } else if (hit._source && hit._source['@timestamp']) {
    return hit._source['@timestamp'];
  }
  return '';
};

export const buildFieldsRequest = (fields: string[]) =>
  uniq([...fields.filter((f) => !f.startsWith('_')), ...TIMELINE_EVENTS_FIELDS]).map((field) => ({
    field,
    include_unmapped: true,
  }));

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

const buildObjectRecursive = (fieldPath: string, fields: Fields): Partial<Ecs> => {
  const nestedParentPath = getNestedParentPath(fieldPath, fields);
  if (!nestedParentPath) {
    return set({}, fieldPath, toStringArray(get(fieldPath, fields)));
  }

  const subPath = fieldPath.replace(`${nestedParentPath}.`, '');
  const subFields = (get(nestedParentPath, fields) ?? []) as Fields[];
  return set(
    {},
    nestedParentPath,
    subFields.map((subField) => buildObjectRecursive(subPath, subField))
  );
};

export const buildObjectForFieldPath = (fieldPath: string, hit: EventHit): Partial<Ecs> => {
  if (has(fieldPath, hit._source)) {
    const value = get(fieldPath, hit._source);
    return set({}, fieldPath, toStringArray(value));
  }

  return buildObjectRecursive(fieldPath, hit.fields);
};

/**
 * If a prefix of our full field path is present as a field, we know that our field is nested
 */
const getNestedParentPath = (fieldPath: string, fields: Fields | undefined): string | undefined =>
  fields &&
  Object.keys(fields).find((field) => field !== fieldPath && fieldPath.startsWith(`${field}.`));

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
      specialFields.includes(fieldName)
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
