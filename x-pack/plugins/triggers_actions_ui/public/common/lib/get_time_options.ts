/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTimeUnitLabel } from './get_time_unit_label';
import { TIME_UNITS } from '../../application/constants';

export const getTimeOptions = (unitSize: number) =>
  Object.entries(TIME_UNITS).map(([_key, value]) => {
    return {
      text: getTimeUnitLabel(value, unitSize.toString()),
      value,
    };
  });

interface TimeFieldOptions {
  text: string;
  value: string;
}

export const getTimeFieldOptions = (
  fields: Array<{ type: string; name: string }>
): TimeFieldOptions[] => {
  const options: TimeFieldOptions[] = [];

  fields.forEach((field: { type: string; name: string }) => {
    if (field.type === 'date') {
      options.push({
        text: field.name,
        value: field.name,
      });
    }
  });
  return options;
};
