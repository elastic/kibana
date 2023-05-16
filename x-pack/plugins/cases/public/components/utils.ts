/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type {
  FieldConfig,
  ValidationConfig,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ConnectorTypeFields } from '../../common/api';
import { ConnectorTypes } from '../../common/api';
import type { CasesPluginStart } from '../types';
import { connectorValidator as swimlaneConnectorValidator } from './connectors/swimlane/validator';
import type { CaseActionConnector } from './types';

export const getConnectorById = (
  id: string,
  connectors: CaseActionConnector[]
): CaseActionConnector | null => connectors.find((c) => c.id === id) ?? null;

const validators: Record<
  string,
  (connector: CaseActionConnector) => ReturnType<ValidationConfig['validator']>
> = {
  [ConnectorTypes.swimlane]: swimlaneConnectorValidator,
};

export const connectorDeprecationValidator = (
  connector: CaseActionConnector
): ReturnType<ValidationConfig['validator']> => {
  if (connector.isDeprecated) {
    return {
      message: 'Deprecated connector',
    };
  }
};

export const getConnectorsFormValidators = ({
  connectors = [],
  config = {},
}: {
  connectors: CaseActionConnector[];
  config: FieldConfig;
}): FieldConfig => ({
  ...config,
  validations: [
    {
      validator: ({ value: connectorId }) => {
        const connector = getConnectorById(connectorId as string, connectors);
        if (connector != null) {
          return connectorDeprecationValidator(connector);
        }
      },
    },
    {
      validator: ({ value: connectorId }) => {
        const connector = getConnectorById(connectorId as string, connectors);
        if (connector != null) {
          return validators[connector.actionTypeId]?.(connector);
        }
      },
    },
  ],
});

/**
 * Fields without a value need to be transformed to null.
 * Passing undefined for a field to the backed will throw an error.
 * Fo that reason, we need to convert empty fields to null.
 */

export const getConnectorsFormSerializer = <T extends { fields: ConnectorTypeFields['fields'] }>(
  data: T
): T => {
  if (data.fields) {
    const serializedFields = convertEmptyValuesToNull(data.fields);

    return {
      ...data,
      fields: serializedFields as ConnectorTypeFields['fields'],
    };
  }

  return data;
};

export const convertEmptyValuesToNull = <T>(fields: T | null | undefined): T | null => {
  if (fields) {
    return Object.entries(fields).reduce((acc, [key, value]) => {
      return {
        ...acc,
        [key]: isEmptyValue(value) ? null : value,
      };
    }, {} as T);
  }

  return null;
};

/**
 * We cannot use lodash isEmpty util function
 * because it will return true for primitive values
 * like boolean or numbers
 */

export const isEmptyValue = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === 'object' && Object.keys(value).length === 0) ||
  (typeof value === 'string' && value.trim().length === 0);

/**
 * Form html elements do not support null values.
 * For that reason, we need to convert null values to
 * undefined which is supported.
 */

export const getConnectorsFormDeserializer = <T extends { fields: ConnectorTypeFields['fields'] }>(
  data: T
): T => {
  if (data.fields) {
    const deserializedFields = Object.entries(data.fields).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: value === null ? undefined : value,
      }),
      {}
    );

    return {
      ...data,
      fields: deserializedFields as ConnectorTypeFields['fields'],
    };
  }

  return data;
};

export const getConnectorIcon = (
  triggersActionsUi: CasesPluginStart['triggersActionsUi'],
  type?: string
): IconType => {
  /**
   * triggersActionsUi.actionTypeRegistry.get will throw an error if the type is not registered.
   * This will break Kibana if not handled properly.
   */
  const emptyResponse = '';

  if (type == null) {
    return emptyResponse;
  }

  try {
    if (triggersActionsUi.actionTypeRegistry.has(type)) {
      return triggersActionsUi.actionTypeRegistry.get(type).iconClass;
    }
  } catch {
    return emptyResponse;
  }

  return emptyResponse;
};

export const isDeprecatedConnector = (connector?: CaseActionConnector): boolean => {
  return connector?.isDeprecated ?? false;
};

export const removeItemFromSessionStorage = (key: string) => {
  window.sessionStorage.removeItem(key);
};
