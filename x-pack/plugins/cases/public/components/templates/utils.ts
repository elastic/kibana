/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { ActionConnector, TemplateConfiguration } from '../../../common/types/domain';
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import { normalizeActionConnector, getNoneConnector } from '../configure_cases/utils';
import {
  customFieldsFormDeserializer,
  customFieldsFormSerializer,
  getConnectorById,
  getConnectorsFormDeserializer,
  getConnectorsFormSerializer,
} from '../utils';
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
  if (data == null) {
    return data;
  }

  const { key, name, description, tags: templateTags, caseFields } = data;
  const { connector, customFields, settings, tags, ...rest } = caseFields ?? {};
  const connectorFields = getConnectorsFormDeserializer({ fields: connector?.fields ?? null });
  const convertedCustomFields = customFieldsFormDeserializer(customFields);

  return {
    key,
    name,
    templateDescription: description ?? '',
    templateTags: templateTags ?? [],
    connectorId: connector?.id ?? 'none',
    fields: connectorFields.fields ?? null,
    customFields: convertedCustomFields ?? {},
    tags: tags ?? [],
    ...rest,
  };
};

export const templateSerializer = (
  connectors: ActionConnector[],
  currentConfiguration: CasesConfigurationUI,
  data: TemplateFormProps
): TemplateConfiguration => {
  if (data == null) {
    return data;
  }

  const {
    fields: connectorFields = null,
    key,
    name,
    customFields: templateCustomFields,
    ...rest
  } = data;

  const serializedConnectorFields = getConnectorsFormSerializer({ fields: connectorFields });
  const nonEmptyFields = removeEmptyFields({ ...rest });

  const {
    connectorId,
    syncAlerts = false,
    templateTags,
    templateDescription,
    ...otherCaseFields
  } = nonEmptyFields;

  const transformedCustomFields = templateCustomFields
    ? customFieldsFormSerializer(templateCustomFields, currentConfiguration.customFields)
    : [];

  const templateConnector = connectorId ? getConnectorById(connectorId, connectors) : null;

  const transformedConnector = templateConnector
    ? normalizeActionConnector(templateConnector, serializedConnectorFields.fields)
    : getNoneConnector();

  const transformedData: TemplateConfiguration = {
    key,
    name,
    description: templateDescription,
    tags: templateTags ?? [],
    caseFields: {
      ...otherCaseFields,
      connector: transformedConnector,
      customFields: transformedCustomFields,
      settings: { syncAlerts },
    },
  };

  return transformedData;
};
