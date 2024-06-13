/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { TemplateConfiguration } from '../../../common/types/domain';
import type { CaseUI } from '../../containers/types';
import { getConnectorsFormDeserializer, getConnectorsFormSerializer } from '../utils';
import type { TemplateFormProps } from './types';

export function removeEmptyFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, value]) => !isEmpty(value) || typeof value === 'boolean')
      .map(([key, value]) => [
        key,
        value === Object(value) && !Array.isArray(value)
          ? removeEmptyFields(value as Record<string, unknown>)
          : value,
      ])
  ) as T;
}

export const convertTemplateCustomFields = (
  customFields?: CaseUI['customFields']
): Record<string, string | boolean> | null => {
  if (!customFields || !customFields.length) {
    return null;
  }

  return customFields.reduce((acc, customField) => {
    const initial = {
      [customField.key]: customField.value,
    };

    return { ...acc, ...initial };
  }, {});
};

export const templateDeserializer = (data: TemplateConfiguration): TemplateFormProps => {
  if (data !== null) {
    const { key, name, description, tags: templateTags, caseFields } = data;
    const { connector, customFields, settings, tags, ...rest } = caseFields ?? {};
    const connectorFields = getConnectorsFormDeserializer({ fields: connector?.fields ?? null });
    const convertedCustomFields = convertTemplateCustomFields(customFields);

    return {
      key,
      name,
      templateDescription: description,
      templateTags,
      connectorId: connector?.id ?? 'none',
      fields: connectorFields.fields,
      customFields: convertedCustomFields ?? {},
      tags: tags ?? [],
      ...rest,
    };
  }

  return data;
};

export const getTemplateSerializedData = (data: TemplateFormProps): TemplateFormProps => {
  if (data !== null) {
    const { fields = null, ...rest } = data;
    const connectorFields = getConnectorsFormSerializer({ fields });
    const serializedFields = removeEmptyFields({ ...rest });

    return {
      ...serializedFields,
      fields: connectorFields.fields,
    } as TemplateFormProps;
  }

  return data;
};
