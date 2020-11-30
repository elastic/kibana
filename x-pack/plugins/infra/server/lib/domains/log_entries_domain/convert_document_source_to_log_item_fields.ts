/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import stringify from 'json-stable-stringify';
import { LogEntriesItemField } from '../../../../common/http_api';
import { JsonArray } from '../../../../common/typed_json';

const serializeValue = (value: JsonArray): string[] => {
  return value.map((v) => {
    if (typeof v === 'object' && v != null) {
      return stringify(v);
    } else {
      return `${v}`;
    }
  });
};

export const convertESFieldsToLogItemFields = (fields: {
  [field: string]: JsonArray;
}): LogEntriesItemField[] => {
  return Object.keys(fields).map((field) => ({ field, value: serializeValue(fields[field]) }));
};
