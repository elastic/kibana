/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject, isNull, isUndefined } from 'lodash';

export function createFormatCsvValues(escapeValue, separator, fields, formatsMap) {
  return function formatCsvValues(values) {
    return fields.map((field) => {
      let value = values[field];

      if (isNull(value) || isUndefined(value)) {
        return '';
      }

      if (formatsMap.has(field)) {
        const formatter = formatsMap.get(field);
        value = formatter.convert(value);
      }

      if (isObject(value)) {
        return JSON.stringify(value);
      }

      return value.toString();
    })
      .map(escapeValue)
      .join(separator);
  };
}
