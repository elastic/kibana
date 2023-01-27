/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateRecordParams, Incident, SwimlaneRecordPayload, MappingConfigType } from './types';

type ConfigMapping = Omit<MappingConfigType, 'commentsConfig'>;

const mappingKeysToIncidentKeys: Record<keyof ConfigMapping, keyof Incident> = {
  ruleNameConfig: 'ruleName',
  alertIdConfig: 'alertId',
  caseIdConfig: 'caseId',
  caseNameConfig: 'caseName',
  severityConfig: 'severity',
  descriptionConfig: 'description',
};

export const getBodyForEventAction = (
  applicationId: string,
  mappingConfig: MappingConfigType,
  params: CreateRecordParams['incident'],
  incidentId?: string
): SwimlaneRecordPayload => {
  const data: SwimlaneRecordPayload = {
    applicationId,
    ...(incidentId ? { id: incidentId } : {}),
    values: {},
  };

  return (Object.keys(mappingConfig) as Array<keyof ConfigMapping>).reduce((acc, key) => {
    const fieldMap = mappingConfig[key];

    if (!fieldMap) {
      return acc;
    }

    const { id, fieldType } = fieldMap;
    const paramName = mappingKeysToIncidentKeys[key];
    const value = params[paramName];

    if (value) {
      switch (fieldType) {
        case 'numeric': {
          const number = Number(value);
          return { ...acc, values: { ...acc.values, [id]: isNaN(number) ? 0 : number } };
        }
        default: {
          return { ...acc, values: { ...acc.values, [id]: value } };
        }
      }
    }

    return acc;
  }, data);
};
