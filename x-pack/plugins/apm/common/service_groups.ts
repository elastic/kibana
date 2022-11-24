/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { getKueryFields } from './utils/get_kuery_fields';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
} from './es_fields/apm';

const LABELS = 'labels'; // implies labels.* wildcard

export const APM_SERVICE_GROUP_SAVED_OBJECT_TYPE = 'apm-service-group';
export const SERVICE_GROUP_COLOR_DEFAULT = '#D1DAE7';
export const MAX_NUMBER_OF_SERVICE_GROUPS = 500;

export interface ServiceGroup {
  groupName: string;
  kuery: string;
  description?: string;
  color?: string;
}

export interface SavedServiceGroup extends ServiceGroup {
  id: string;
  updatedAt: number;
}

export const SERVICE_GROUP_SUPPORTED_FIELDS = [
  AGENT_NAME,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  LABELS,
];

export function isSupportedField(fieldName: string) {
  return (
    fieldName.startsWith(LABELS) ||
    SERVICE_GROUP_SUPPORTED_FIELDS.includes(fieldName)
  );
}

export function validateServiceGroupKuery(kuery: string): {
  isValidFields: boolean;
  isValidSyntax: boolean;
  message?: string;
} {
  try {
    const kueryFields = getKueryFields([fromKueryExpression(kuery)]);
    const unsupportedKueryFields = kueryFields.filter(
      (fieldName) => !isSupportedField(fieldName)
    );
    if (unsupportedKueryFields.length === 0) {
      return { isValidFields: true, isValidSyntax: true };
    }
    return {
      isValidFields: false,
      isValidSyntax: true,
      message: i18n.translate('xpack.apm.serviceGroups.invalidFields.message', {
        defaultMessage:
          'Query filter for service group does not support fields [{unsupportedFieldNames}]',
        values: {
          unsupportedFieldNames: unsupportedKueryFields.join(', '),
        },
      }),
    };
  } catch (error) {
    return {
      isValidFields: false,
      isValidSyntax: false,
      message: error.message,
    };
  }
}
