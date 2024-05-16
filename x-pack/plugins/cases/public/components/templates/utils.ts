/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypeFields } from '@kbn/cases-plugin/common/types/domain';
import { getConnectorsFormDeserializer, isEmptyValue } from '../utils';
import type { TemplateFormProps } from './types';

export const removeEmptyFields = (
  fields: TemplateFormProps['caseFields'] | Record<string, string | boolean> | null | undefined
): TemplateFormProps['caseFields'] => {
  if (fields) {
    return Object.entries(fields).reduce((acc, [key, value]) => {
      let initialValue = {};

      if (key === 'customFields') {
        const nonEmptyFields = removeEmptyFields(value as Record<string, string | boolean>) ?? {};

        if (Object.entries(nonEmptyFields).length > 0) {
          initialValue = {
            customFields: nonEmptyFields,
          };
        }
      } else if (key === 'connectorFields' && !isEmptyValue(value)) {
        initialValue = { [key]: value };
      } else if (!isEmptyValue(value)) {
        initialValue = { [key]: value };
      }

      return {
        ...acc,
        ...initialValue,
      };
    }, {});
  }

  return null;
};

export const templateSerializer = <T extends TemplateFormProps | null>(data: T): T => {
  if (data !== null && data.caseFields) {
    console.log('templateSerializer', { data });
    const serializedFields = removeEmptyFields(data.caseFields);

    return {
      ...data,
      caseFields: serializedFields as TemplateFormProps['caseFields'],
    };
  }

  return data;
};

export const templateDeserializer = <T extends TemplateFormProps | null>(data: T): T => {
  if (data && data.caseFields) {
    const connectorFields = data.caseFields.fields
      ? getConnectorsFormDeserializer({ fields: data.caseFields.fields })
      : { fields: {} };
    return {
      ...data,
      caseFields: {
        ...data?.caseFields,
        fields: connectorFields?.fields,
      },
    };
  }

  return data;
};
