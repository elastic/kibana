/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateRecordParams, MappingConfigType, SwimlaneRecordPayload } from './types';

export const getBodyForEventAction = (
  applicationId: string,
  mappingConfig: MappingConfigType,
  params: CreateRecordParams
): SwimlaneRecordPayload => {
  const data: SwimlaneRecordPayload = {
    applicationId,
  };

  const values: Record<string, string | number> = {};

  for (const mappingsKey in mappingConfig) {
    if (!Object.hasOwnProperty.call(mappingConfig, mappingsKey)) {
      continue;
    }

    const fieldMap = mappingConfig[mappingsKey];

    if (!fieldMap) {
      continue;
    }

    const { id, fieldType } = fieldMap;
    const paramName = mappingsKey.replace('Config', '');
    if (params[paramName]) {
      const value = params[paramName];
      if (value) {
        switch (fieldType) {
          case 'numeric': {
            values[id] = +value;
            break;
          }
          default: {
            values[id] = value;
            break;
          }
        }
      }
    }
  }

  data.values = values;

  return data;
};
