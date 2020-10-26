/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import stringify from 'json-stable-stringify';
import { LogEntriesItemField } from '../../../../common/http_api';
import { JsonArray, JsonObject, jsonObjectRT, JsonValue } from '../../../../common/typed_json';

const serializeValue = (value: JsonValue): string => {
  if (typeof value === 'object' && value != null) {
    return stringify(value);
  } else {
    return `${value}`;
  }
};

// TODO: move rendering to browser
export const convertESFieldsToLogItemFields = (fields: {
  [field: string]: JsonArray;
}): LogEntriesItemField[] => {
  return Object.keys(fields).map((field) => ({ field, value: serializeValue(fields[field]) }));
};

export const convertDocumentSourceToLogItemFields = (
  source: JsonObject,
  path: string[] = [],
  fields: LogEntriesItemField[] = []
): LogEntriesItemField[] => {
  return Object.keys(source).reduce((acc, key) => {
    const value = source[key];
    const nextPath = [...path, key];
    if (jsonObjectRT.is(value)) {
      return convertDocumentSourceToLogItemFields(value, nextPath, acc);
    }
    const field = { field: nextPath.join('.'), value: serializeValue(value) };
    return [...acc, field];
  }, fields);
};
