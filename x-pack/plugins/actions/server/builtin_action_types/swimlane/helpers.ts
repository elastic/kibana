/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateRecordParams,
  ExecutorSubActionCreateRecordParams,
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

  for (const mappingsKey in mappingConfig) {
    if (!Object.hasOwnProperty.call(mappingConfig, mappingsKey)) {
      continue;
    }

    const fieldMap = mappingConfig[mappingsKey];

    if (!fieldMap) {
      continue;
    }

    const createdDate = new Date().toISOString();
    const { id, fieldType } = fieldMap;
    const paramName = mappingsKey.replace(
      'Config',
      ''
    ) as keyof ExecutorSubActionCreateRecordParams;
    if (params[paramName]) {
      const value = params[paramName];
      if (value) {
        switch (fieldType) {
          case 'comments': {
            if (comments[id] != null) {
              comments[id] = [
                ...comments[id],
                { fieldId: id, message: value, createdDate, isRichText: true },
              ];
            } else {
              comments[id] = [{ fieldId: id, message: value, createdDate, isRichText: true }];
            }
            break;
          }
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
  if (Object.keys(comments).length) {
    data.comments = comments;
  }

  return data;
};

export const removeCommentFieldUpdatedInformation = (content: string): string => {
  // these values are added on in `transformFields` in `x-pack/plugins/cases/server/client/cases/utils.ts`
  // have to remove to compare string values
  // probably a bug
  if (content.indexOf(` (updated at `) > 0) {
    return content.slice(0, content.indexOf(` (updated at`));
  }
  if (content.indexOf(` (created at `) > 0) {
    return content.slice(0, content.indexOf(` (created at`));
  }
  return content;
};
