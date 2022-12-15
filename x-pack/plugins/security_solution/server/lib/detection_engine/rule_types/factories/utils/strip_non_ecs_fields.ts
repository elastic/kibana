/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';

import { isPlainObject, cloneDeep, unset } from 'lodash';

import type { SearchTypes } from '../../../../../../common/detection_engine/types';

// const getECSObjectFields =

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
 * check whether field is value is ECS compliant
 */
const computeIsEcsCompliant = (value: Record<string, SearchTypes> | SearchTypes, path: string) => {
  const ecsField = ecsFieldMap[path as keyof typeof ecsFieldMap];

  const isEcsFieldObject =
    ['object', 'flattened'].includes(ecsField?.type) || ecsObjectFields[path];

  // if checked value is object but ECS field not, it's not compliant
  if (isPlainObject(value) && !isEcsFieldObject) {
    return false;
  }

  // if checked value is not object but ECS field is, it's not compliant
  if (!isPlainObject(value) && isEcsFieldObject) {
    return false;
  }

  return true;
};

interface StripNonEcsFieldsReturn {
  result: Record<string, SearchTypes>;
  removed: Array<{ key: string; value: SearchTypes }>;
}

/**
 * strips alert source object from ECS non compliant fields
 */
export const stripNonEcsFields = (doc: Record<string, SearchTypes>): StripNonEcsFieldsReturn => {
  const result = cloneDeep(doc);
  const removed: Array<{ key: string; value: SearchTypes }> = [];

  const traverseAndDeleteInObj = (
    document: Record<string, SearchTypes> | SearchTypes,
    path: string
  ) => {
    if (path && !computeIsEcsCompliant(document, path)) {
      unset(result, path);

      removed.push({ key: path, value: document });
    }

    if (isPlainObject(document)) {
      Object.entries(document as Record<string, SearchTypes>).forEach(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key;

        traverseAndDeleteInObj(value, fullPath);
      });
    }
  };

  traverseAndDeleteInObj(result, '');
  return {
    result,
    removed,
  };
};
