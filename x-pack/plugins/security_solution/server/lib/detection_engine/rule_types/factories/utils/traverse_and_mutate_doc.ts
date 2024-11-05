/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/alerts-as-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { isPlainObject, isArray } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

import type { SearchTypes } from '../../../../../../common/detection_engine/types';
import { isValidIpType } from './ecs_types_validators/is_valid_ip_type';
import { isValidDateType } from './ecs_types_validators/is_valid_date_type';
import { isValidNumericType } from './ecs_types_validators/is_valid_numeric_type';
import { isValidBooleanType } from './ecs_types_validators/is_valid_boolean_type';
import { isValidLongType } from './ecs_types_validators/is_valid_long_type';
import {
  ALERT_ORIGINAL_EVENT,
  ALERT_THRESHOLD_RESULT,
} from '../../../../../../common/field_maps/field_names';

type SourceFieldRecord = Record<string, SearchTypes>;
type SourceField = SearchTypes | SourceFieldRecord;

/**
 * type guard for object of SearchTypes
 */
const isSearchTypesRecord = (value: SourceField): value is SourceFieldRecord => {
  return isPlainObject(value);
};

/**
 * retrieve all nested object fields from ecsFieldMap
 * field `agent.build.original` will be converted into
 * { agent: true, agent.build: true }
 */
const getEcsObjectFields = () => {
  const result: Record<string, boolean> = {};

  Object.entries(ecsFieldMap).forEach(([key, value]) => {
    const objects = key.split('.');
    // last item can be any of type, as precedent are objects
    objects.pop();

    objects.reduce((parentPath, itemKey) => {
      const fullPath = parentPath ? `${parentPath}.${itemKey}` : itemKey;

      if (!result[fullPath]) {
        result[fullPath] = true;
      }

      return fullPath;
    }, '');
  });

  return result;
};

const ecsObjectFields = getEcsObjectFields();

/**
 * checks if path is a valid Ecs object type (object or flattened)
 * geo_point also can be object
 */
const getIsEcsFieldObject = (path: string) => {
  const ecsField = ecsFieldMap[path as keyof typeof ecsFieldMap];
  return ['object', 'flattened', 'geo_point'].includes(ecsField?.type) || ecsObjectFields[path];
};

/**
 * checks if path is in Ecs mapping
 */
export const getIsEcsField = (path: string): boolean => {
  const ecsField = ecsFieldMap[path as keyof typeof ecsFieldMap];
  const isEcsField = Boolean(!!ecsField || ecsObjectFields[path]);

  return isEcsField;
};

/**
 * if any of partial path in dotted notation is not an object in ECS mapping
 * it means the field itself is not valid as well
 * For example, 'agent.name.conflict' - if agent.name is keyword, so the whole path is invalid
 */
const validateDottedPathInEcsMappings = (path: string): boolean => {
  let isValid = true;
  path
    .split('.')
    .slice(0, -1) // exclude last path item, as we check only if all parent are objects
    .reduce((acc, key) => {
      const pathToValidate = [acc, key].filter(Boolean).join('.');
      const isEcsField = getIsEcsField(pathToValidate);
      const isEcsFieldObject = getIsEcsFieldObject(pathToValidate);

      // if field is in Ecs mapping and not object, the whole path is invalid
      if (isEcsField && !isEcsFieldObject) {
        isValid = false;
      }
      return pathToValidate;
    }, '');

  return isValid;
};

/**
 * check whether source field value is ECS compliant
 */
const computeIsEcsCompliant = (value: SourceField, path: string) => {
  // if path consists of dot-notation, ensure each path within it is ECS compliant (object or flattened)
  if (path.includes('.') && !validateDottedPathInEcsMappings(path)) {
    return false;
  }

  const isEcsField = getIsEcsField(path);

  // if field is not present is ECS mapping, it's valid as doesn't have any conflicts with existing mapping
  if (!isEcsField) {
    return true;
  }

  const ecsField = ecsFieldMap[path as keyof typeof ecsFieldMap];
  const isEcsFieldObject = getIsEcsFieldObject(path);

  // do not validate geo_point, since it's very complex type that can be string/array/object
  if (ecsField?.type === 'geo_point') {
    return true;
  }

  // validate if value is a long type
  if (ecsField?.type === 'long') {
    return isValidLongType(value);
  }

  // validate if value is a numeric type
  if (ecsField?.type === 'float' || ecsField?.type === 'scaled_float') {
    return isValidNumericType(value);
  }

  // validate if value is a valid ip type
  if (ecsField?.type === 'ip') {
    return isValidIpType(value);
  }

  // validate if value is a valid date
  if (ecsField?.type === 'date') {
    return isValidDateType(value);
  }

  // validate if value is a valid boolean
  if (ecsField?.type === 'boolean') {
    return isValidBooleanType(value);
  }

  // if ECS mapping is JS object and source value also JS object then they are compliant
  // otherwise not
  return isEcsFieldObject ? isPlainObject(value) : !isPlainObject(value);
};

const bannedFields = ['kibana', 'signal', 'threshold_result', ALERT_THRESHOLD_RESULT];

/**
 * Traverse an entire source document and mutate it to prepare for indexing into the alerts index. Traversing the document
 * is computationally expensive so we only want to traverse it once, therefore a few distinct cases are handled in this function:
 * 1. Fields that we must explicitly remove, like `kibana` and `signal`, fields, are removed from the document.
 * 2. Fields that are incompatible with ECS are removed.
 * 3. All `event.*` fields are collected and copied to `kibana.alert.original_event.*` using `fieldsToAdd`
 * @param document The document to traverse
 * @returns The mutated document, a list of removed fields
 */
export const traverseAndMutateDoc = (document: SourceFieldRecord) => {
  const { result, removed, fieldsToAdd } = internalTraverseAndMutateDoc({
    document,
    path: [],
    topLevel: true,
    removed: [],
    fieldsToAdd: [],
  });

  fieldsToAdd.forEach(({ key, value }) => {
    result[key] = value;
  });

  return { result, removed };
};

const internalTraverseAndMutateDoc = <T extends SourceFieldRecord>({
  document,
  path,
  topLevel,
  removed,
  fieldsToAdd,
}: {
  document: T;
  path: string[];
  topLevel: boolean;
  removed: Array<{ key: string; value: SearchTypes }>;
  fieldsToAdd: Array<{ key: string; value: SearchTypes }>;
}) => {
  Object.keys(document).forEach((key) => {
    // Using Object.keys and fetching the value for each key separately performs better in profiling than using Object.entries
    const value = document[key];
    const fullPathArray = [...path, key];
    const fullPath = fullPathArray.join('.');
    // Insert checks that don't care about the value - only depend on the key - up here
    let deleted = false;
    if (topLevel) {
      const firstKeyString = key.split('.')[0];
      bannedFields.forEach((bannedField) => {
        if (firstKeyString === bannedField) {
          delete document[key];
          deleted = true;
          removed.push({ key: fullPath, value });
        }
      });
    }

    // If we passed the key check, additional checks based on key and value are done below. Items in arrays are treated independently from each other.
    if (!deleted) {
      if (isArray(value)) {
        const newValue = traverseArray({ array: value, path: fullPathArray, removed, fieldsToAdd });
        if (newValue.length > 0) {
          set(document, key, newValue);
        } else {
          delete document[key];
          deleted = true;
        }
      } else if (!computeIsEcsCompliant(value, fullPath)) {
        delete document[key];
        deleted = true;
        removed.push({ key: fullPath, value });
      } else if (isSearchTypesRecord(value)) {
        internalTraverseAndMutateDoc({
          document: value,
          path: fullPathArray,
          topLevel: false,
          removed,
          fieldsToAdd,
        });
        if (Object.keys(value).length === 0) {
          delete document[key];
          deleted = true;
        }
      }
    }

    // We're keeping the field, but maybe we want to copy it to a different field as well
    if (!deleted && fullPath.split('.')[0] === 'event' && topLevel) {
      // The value might have changed above when we `set` after traversing an array
      const valueRefetch = document[key];
      const newKey = `${ALERT_ORIGINAL_EVENT}${fullPath.replace('event', '')}`;
      if (isPlainObject(valueRefetch)) {
        const flattenedObject = flattenWithPrefix(newKey, valueRefetch);
        for (const [k, v] of Object.entries(flattenedObject)) {
          fieldsToAdd.push({ key: k, value: v });
        }
      } else {
        fieldsToAdd.push({
          key: `${ALERT_ORIGINAL_EVENT}${fullPath.replace('event', '')}`,
          value: valueRefetch,
        });
      }
    }
  });
  return { result: document, removed, fieldsToAdd };
};

const traverseArray = ({
  array,
  path,
  removed,
  fieldsToAdd,
}: {
  array: SearchTypes[];
  path: string[];
  removed: Array<{ key: string; value: SearchTypes }>;
  fieldsToAdd: Array<{ key: string; value: SearchTypes }>;
}): SearchTypes[] => {
  const pathString = path.join('.');
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (isArray(value)) {
      array[i] = traverseArray({ array: value, path, removed, fieldsToAdd });
    }
  }
  return array.filter((value) => {
    if (isArray(value)) {
      return value.length > 0;
    } else if (!computeIsEcsCompliant(value, pathString)) {
      removed.push({ key: pathString, value });
      return false;
    } else if (isSearchTypesRecord(value)) {
      internalTraverseAndMutateDoc({
        document: value,
        path,
        topLevel: false,
        removed,
        fieldsToAdd,
      });
      return Object.keys(value).length > 0;
    } else {
      return true;
    }
  });
};
