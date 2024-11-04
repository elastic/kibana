/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { isEmpty } from 'lodash';
import type {
  FieldConfig,
  ValidationConfig,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ConnectorTypeFields } from '../../common/types/domain';
import { ConnectorTypes, CustomFieldTypes } from '../../common/types/domain';
import type { CasesPublicStartDependencies } from '../types';
import { connectorValidator as swimlaneConnectorValidator } from './connectors/swimlane/validator';
import type { CaseActionConnector } from './types';
import type {
  CasesConfigurationUI,
  CaseUI,
  CaseUICustomField,
  CaseUser,
  CaseUsers,
} from '../../common/ui/types';
import { convertToCaseUserWithProfileInfo } from './user_profiles/user_converter';
import type { CaseUserWithProfileInfo } from './user_profiles/types';

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
  triggersActionsUi: CasesPublicStartDependencies['triggersActionsUi'],
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

export const stringifyToURL = (parsedParams: Record<string, string> | URLSearchParams) =>
  new URLSearchParams(parsedParams).toString();

export const parseURL = (queryString: string) =>
  Object.fromEntries(new URLSearchParams(queryString));

export const parseCaseUsers = ({
  caseUsers,
  createdBy,
}: {
  caseUsers?: CaseUsers;
  createdBy: CaseUser;
}): {
  userProfiles: Map<string, UserProfileWithAvatar>;
  reporterAsArray: CaseUserWithProfileInfo[];
} => {
  const userProfiles = new Map();
  const reporterAsArray =
    caseUsers?.reporter != null
      ? [caseUsers.reporter]
      : [convertToCaseUserWithProfileInfo(createdBy)];

  if (caseUsers) {
    for (const user of [
      ...caseUsers.assignees,
      ...caseUsers.participants,
      caseUsers.reporter,
      ...caseUsers.unassignedUsers,
    ]) {
      /**
       * If the user has a valid profile UID and a valid username
       * then the backend successfully fetched the user profile
       * information from the security plugin. Checking only for the
       * profile UID is not enough as a user can use our API to add
       * an assignee with a non existing UID.
       */
      if (user.uid != null && user.user.username != null) {
        userProfiles.set(user.uid, {
          uid: user.uid,
          user: user.user,
          data: {
            avatar: user.avatar,
          },
        });
      }
    }
  }

  return { userProfiles, reporterAsArray };
};

export const convertCustomFieldValue = ({
  value,
  type,
}: {
  value: string | number | boolean | null;
  type: CustomFieldTypes;
}) => {
  if (typeof value === 'string' && isEmpty(value)) {
    return null;
  }

  if (type === CustomFieldTypes.NUMBER) {
    if (value !== null && Number.isSafeInteger(Number(value))) {
      return Number(value);
    } else {
      return null;
    }
  }

  return value;
};

export const addOrReplaceField = <T extends { key: string }>(fields: T[], fieldToAdd: T): T[] => {
  const foundFieldIndex = fields.findIndex((field) => field.key === fieldToAdd.key);

  if (foundFieldIndex === -1) {
    return [...fields, fieldToAdd];
  }

  return fields.map((field) => {
    if (field.key !== fieldToAdd.key) {
      return field;
    }

    return fieldToAdd;
  });
};

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

export const customFieldsFormDeserializer = (
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

export const customFieldsFormSerializer = (
  customFields: Record<string, string | boolean | number | null>,
  selectedCustomFieldsConfiguration: CasesConfigurationUI['customFields']
): CaseUI['customFields'] => {
  const transformedCustomFields: CaseUI['customFields'] = [];

  if (!customFields || !selectedCustomFieldsConfiguration.length) {
    return [];
  }

  for (const [key, value] of Object.entries(customFields)) {
    const configCustomField = selectedCustomFieldsConfiguration.find((item) => item.key === key);
    if (configCustomField) {
      transformedCustomFields.push({
        key: configCustomField.key,
        type: configCustomField.type,
        value: convertCustomFieldValue({ value, type: configCustomField.type }),
      } as CaseUICustomField);
    }
  }

  return transformedCustomFields;
};
