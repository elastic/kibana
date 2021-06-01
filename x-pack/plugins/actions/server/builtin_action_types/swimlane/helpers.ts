/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateRecordParams,
  ExecutorSubActionPushParams,
  MappingConfigType,
  SwimlaneDataComments,
  SwimlaneDataValues,
  SwimlaneRecordPayload,
} from './types';

export const getBodyForEventAction = (
  applicationId: string,
  mappingConfig: MappingConfigType,
  params: CreateRecordParams['incident'],
  incidentId?: string
): SwimlaneRecordPayload => {
  const data: SwimlaneRecordPayload = {
    applicationId,
    ...(incidentId ? { id: incidentId } : {}),
  };

  const values: SwimlaneDataValues = {};
  const comments: SwimlaneDataComments = {};

  for (const mappingsKey of Object.keys(mappingConfig)) {
    const fieldMap = mappingConfig[mappingsKey];

    if (!fieldMap) {
      continue;
    }

    const createdDate = new Date().toISOString();
    const { id, fieldType } = fieldMap;
    const paramName = mappingsKey.replace('Config', '') as keyof CreateRecordParams['incident'];

    const value = params[paramName];

    if (value) {
      switch (fieldType) {
        case 'comments': {
          comments[id] = [
            ...(comments[id] != null ? comments[id] : []),
            { fieldId: id, message: value, createdDate, isRichText: true },
          ];
          break;
        }
        case 'numeric': {
          const number = Number(value);
          values[id] = isNaN(number) ? 0 : number;
          break;
        }
        default: {
          values[id] = value;
          break;
        }
      }
    }
  }

  data.values = values;
  if (Object.keys(comments).length) {
    data.comments = comments;
  }

  return data;
};
