/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';

const renameActionVariable = (field: string): string => {
  switch (field) {
    case SERVICE_NAME:
      return 'serviceName';
    case SERVICE_ENVIRONMENT:
      return 'environment';
    case TRANSACTION_TYPE:
      return 'transactionType';
    default:
      return field;
  }
};

export const allValueLabel = i18n.translate('xpack.apm.filter.field.allLabel', {
  defaultMessage: 'All',
});

export function getFieldValueLabel(fieldValue: string): string {
  if (!fieldValue || fieldValue.includes('NOT_DEFINED')) {
    return i18n.translate('xpack.apm.filter.field.notDefinedLabel', {
      defaultMessage: 'Not defined',
    });
  }

  if (fieldValue.endsWith('_ALL')) {
    return allValueLabel;
  }

  return fieldValue;
}

export const getGroupByActionVariables = (
  groupByFields: Record<string, string>
): Record<string, string> => {
  return Object.keys(groupByFields).reduce<Record<string, string>>(
    (acc, cur) => {
      acc[renameActionVariable(cur)] = getFieldValueLabel(groupByFields[cur]);
      return acc;
    },
    {}
  );
};
