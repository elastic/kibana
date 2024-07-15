/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/alerts-as-data-utils';

import { isPlainObject, cloneDeep, isArray } from 'lodash';

import type { SearchTypes } from '../../../../../../common/detection_engine/types';
import { isValidIpType } from './ecs_types_validators/is_valid_ip_type';
import { isValidDateType } from './ecs_types_validators/is_valid_date_type';
import { isValidNumericType } from './ecs_types_validators/is_valid_numeric_type';
import { isValidBooleanType } from './ecs_types_validators/is_valid_boolean_type';
import { isValidLongType } from './ecs_types_validators/is_valid_long_type';

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

interface StripNonEcsFieldsReturn {
  result: SourceFieldRecord;
  removed: Array<{ key: string; value: SearchTypes }>;
}

/**
 * strips alert source object from ECS non compliant fields
 */
export const stripNonEcsFields = (doc: SourceFieldRecord): StripNonEcsFieldsReturn => {
  const result = cloneDeep(doc);
  const removed: Array<{ key: string; value: SearchTypes }> = [];

  /**
   * traverses through object and deletes ECS non compliant fields
   * @param document - document to traverse
   * @param documentKey - document key in parent document, if exists
   * @param parent - parent of traversing document
   * @param parentPath - path of parent in initial source document
   */
  const traverseAndDeleteInObj = (
    document: SourceField,
    documentKey: string,
    parent?: SourceFieldRecord,
    parentPath?: string
  ) => {
    const fullPath = [parentPath, documentKey].filter(Boolean).join('.');
    // if document array, traverse through each item w/o changing documentKey, parent, parentPath
    if (isArray(document) && document.length > 0) {
      document.slice().forEach((value) => {
        traverseAndDeleteInObj(value, documentKey, parent, parentPath);
      });
      return;
    }

    if (parent && !computeIsEcsCompliant(document, fullPath)) {
      const documentReference = parent[documentKey];
      // if document reference in parent is array, remove only this item from array
      // e.g. a boolean mapped field with values ['not-boolean', 'true'] should strip 'not-boolean' and leave 'true'
      if (isArray(documentReference)) {
        const indexToDelete = documentReference.findIndex((item) => item === document);
        documentReference.splice(indexToDelete, 1);
        if (documentReference.length === 0) {
          delete parent[documentKey];
        }
      } else {
        delete parent[documentKey];
      }
      removed.push({ key: fullPath, value: document });
      return;
    }

    if (isSearchTypesRecord(document)) {
      Object.entries(document).forEach(([key, value]) => {
        traverseAndDeleteInObj(value, key, document, fullPath);
      });
    }
  };

  traverseAndDeleteInObj(result, '');
  return {
    result,
    removed,
  };
};
