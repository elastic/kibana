/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNull, isObject, isUndefined } from 'lodash';
import { FieldFormat } from 'src/plugins/data/common';
import { RawValue } from '../types';

export function createFormatCsvValues(
  escapeValue: (value: RawValue, index: number, array: RawValue[]) => string,
  separator: string,
  fields: string[],
  formatsMap: Map<string, FieldFormat>
) {
  return function formatCsvValues(values: Record<string, RawValue>) {
    return fields
      .map((field) => {
        let value;
        if (field === '_source') {
          value = values;
        } else {
          value = values[field];
        }
        if (isNull(value) || isUndefined(value)) {
          return '';
        }

        let formattedValue = value;
        if (formatsMap.has(field)) {
          const formatter = formatsMap.get(field);
          if (formatter) {
            formattedValue = formatter.convert(value);
          }
        }

        return formattedValue;
      })
      .map((value) => (isObject(value) ? JSON.stringify(value) : value))
      .map((value) => (value ? value.toString() : value))
      .map(escapeValue)
      .join(separator);
  };
}
