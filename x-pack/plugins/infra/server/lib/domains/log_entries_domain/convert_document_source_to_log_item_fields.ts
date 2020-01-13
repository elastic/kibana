/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import stringify from 'json-stable-stringify';
import { isArray, isPlainObject } from 'lodash';

import { JsonObject } from '../../../../common/typed_json';
import { LogEntriesItemField } from '../../../../common/http_api';

const isJsonObject = (subject: any): subject is JsonObject => {
  return isPlainObject(subject);
};

const serializeValue = (value: any): string => {
  if (isArray(value) || isPlainObject(value)) {
    return stringify(value);
  }
  return `${value}`;
};

export const convertDocumentSourceToLogItemFields = (
  source: JsonObject,
  path: string[] = [],
  fields: LogEntriesItemField[] = []
): LogEntriesItemField[] => {
  return Object.keys(source).reduce((acc, key) => {
    const value = source[key];
    const nextPath = [...path, key];
    if (isJsonObject(value)) {
      return convertDocumentSourceToLogItemFields(value, nextPath, acc);
    }
    const field = { field: nextPath.join('.'), value: serializeValue(value) };
    return [...acc, field];
  }, fields);
};
