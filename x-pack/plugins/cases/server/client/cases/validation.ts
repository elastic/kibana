/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { differenceWith, intersectionWith } from 'lodash';
import Boom from '@hapi/boom';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type { CaseRequestCustomFields } from '../../../common/types/api';
import type { UpdateRequestWithOriginalCase } from './update';

interface CustomFieldValidationParams {
  requestCustomFields?: CaseRequestCustomFields;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}

interface CustomFieldValidationParamsMultipleCases {
  casesToUpdate: UpdateRequestWithOriginalCase[];
  customFieldsConfigurationMap: Record<string, CustomFieldsConfiguration>;
}

/**
 * Throws if the custom field types in the request dont match the configuration.
 */
export function throwIfCustomFieldTypesInvalid(validationParams: CustomFieldValidationParams) {
  const invalidCustomFieldKeys = validateCustomFieldTypesInRequest(validationParams);

  if (invalidCustomFieldKeys.length) {
    throw Boom.badRequest(
      `The following custom fields have the wrong type in the request: ${invalidCustomFieldKeys}`
    );
  }
}

/**
 * Throws if the custom field types in multiple requests dont match the corresponding configuration.
 */
export function throwIfCustomFieldTypesInvalidForMultipleCases({
  casesToUpdate,
  customFieldsConfigurationMap,
}: CustomFieldValidationParamsMultipleCases) {
  const invalidKeysPerCase: Record<string, string[]> = {};

  casesToUpdate.forEach(({ updateReq, originalCase }) => {
    if (updateReq.customFields) {
      const owner = originalCase.attributes.owner;
      const customFieldsConfiguration = customFieldsConfigurationMap[owner] ?? [];

      invalidKeysPerCase[originalCase.id] = validateCustomFieldTypesInRequest({
        requestCustomFields: updateReq.customFields,
        customFieldsConfiguration,
      });
    }
  });

  Object.keys(invalidKeysPerCase).forEach((caseId) => {
    if (invalidKeysPerCase[caseId].length) {
      throw Boom.badRequest(
        `The case with case id ${caseId} has invalid types for the following custom field: ${invalidKeysPerCase[caseId]}`
      );
    }
  });
}

/**
 * Returns a list of custom fields where the type doesnt match the configuration.
 */
export function validateCustomFieldTypesInRequest({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return [];
  }

  if (customFieldsConfiguration === undefined) {
    throw Boom.badRequest('No custom fields configured.');
  }

  let invalidCustomFieldKeys: string[] = [];
  const validCustomFields = intersectionWith(
    customFieldsConfiguration,
    requestCustomFields,
    (requiredVal, requestedVal) =>
      requiredVal.key === requestedVal.key && requiredVal.type === requestedVal.type
  );

  if (requestCustomFields.length !== validCustomFields.length) {
    invalidCustomFieldKeys = differenceWith(
      requestCustomFields,
      validCustomFields,
      (requiredVal, requestedVal) => requiredVal.key === requestedVal.key
    ).map((e) => e.key);
  }

  return invalidCustomFieldKeys;
}

/**
 * Throws if any of the custom field keys in the request does not exist in the case configuration.
 */
export function throwIfCustomFieldKeysDoNotExist(validationParams: CustomFieldValidationParams) {
  const invalidCustomFieldKeys = validateCustomFieldKeysAgainstConfiguration(validationParams);

  if (invalidCustomFieldKeys.length) {
    throw Boom.badRequest(`Invalid custom field keys: ${invalidCustomFieldKeys}`);
  }
}

/**
 * Throws if any of the custom field keys in multiple request does not exist in the corresponding case configuration.
 */
export function throwIfCustomFieldKeysDoNotExistForMultipleCases({
  casesToUpdate,
  customFieldsConfigurationMap,
}: CustomFieldValidationParamsMultipleCases) {
  const invalidKeysPerCase: Record<string, string[]> = {};

  casesToUpdate.forEach(({ updateReq, originalCase }) => {
    if (updateReq.customFields) {
      const owner = originalCase.attributes.owner;
      const customFieldsConfiguration = customFieldsConfigurationMap[owner] ?? [];

      invalidKeysPerCase[originalCase.id] = validateCustomFieldKeysAgainstConfiguration({
        requestCustomFields: updateReq.customFields,
        customFieldsConfiguration,
      });
    }
  });

  Object.keys(invalidKeysPerCase).forEach((caseId) => {
    if (invalidKeysPerCase[caseId].length) {
      throw Boom.badRequest(
        `The case with case id ${caseId} has the following invalid custom field keys: ${invalidKeysPerCase[caseId]}`
      );
    }
  });
}

/**
 * Returns a list of custom fields in the request where the key doesnt match the configuration.
 */
export const validateCustomFieldKeysAgainstConfiguration = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams): string[] => {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return [];
  }

  if (customFieldsConfiguration === undefined) {
    throw Boom.badRequest('No custom fields configured.');
  }

  return differenceWith(
    requestCustomFields,
    customFieldsConfiguration,
    (requestVal, configurationVal) => requestVal.key === configurationVal.key
  ).map((e) => e.key);
};

/**
 * Throws if there are required custom fields missing in the request.
 */
export function throwIfMissingRequiredCustomField(validationParams: CustomFieldValidationParams) {
  const invalidCustomFieldKeys = validateRequiredCustomFields(validationParams);

  if (invalidCustomFieldKeys.length) {
    throw Boom.badRequest(`Missing required custom fields: ${invalidCustomFieldKeys}`);
  }
}

/**
 * Throws if there are required custom fields missing in a request for multiple cases.
 */
export function throwIfMissingRequiredCustomFieldForMultipleCases({
  casesToUpdate,
  customFieldsConfigurationMap,
}: CustomFieldValidationParamsMultipleCases) {
  const invalidKeysPerCase: Record<string, string[]> = {};

  casesToUpdate.forEach(({ updateReq, originalCase }) => {
    if (updateReq.customFields) {
      const owner = originalCase.attributes.owner;
      const customFieldsConfiguration = customFieldsConfigurationMap[owner] ?? [];

      invalidKeysPerCase[originalCase.id] = validateRequiredCustomFields({
        requestCustomFields: updateReq.customFields,
        customFieldsConfiguration,
      });
    }
  });

  Object.keys(invalidKeysPerCase).forEach((caseId) => {
    if (invalidKeysPerCase[caseId].length) {
      throw Boom.badRequest(
        `The case with case id ${caseId} has the following missing required custom field: ${invalidKeysPerCase[caseId]}`
      );
    }
  });
}

/**
 * Returns a list of required custom fields missing from the request
 */
export const validateRequiredCustomFields = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams): string[] => {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return [];
  }

  if (customFieldsConfiguration === undefined) {
    throw Boom.badRequest('No custom fields configured.');
  }

  const requiredCustomFields = customFieldsConfiguration.filter(
    (customField) => customField.required
  );

  const invalidCustomFieldKeys = differenceWith(
    requiredCustomFields,
    requestCustomFields,
    (requiredVal, requestedVal) => requiredVal.key === requestedVal.key
  ).map((e) => e.key);

  return invalidCustomFieldKeys;
};

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const throwIfDuplicatedCustomFieldKeysInRequest = ({
  requestCustomFields = [],
}: {
  requestCustomFields?: Array<{ key: string }>;
}) => {
  const duplicatedKeys = validateDuplicatedCustomFieldKeysInRequest({ requestCustomFields });

  if (duplicatedKeys.length) {
    throw Boom.badRequest(
      `Invalid duplicated custom field keys in request: ${Array.from(duplicatedKeys.values())}`
    );
  }
};

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const throwIfDuplicatedCustomFieldKeysInRequestForMultipleCases = ({
  casesToUpdate,
}: {
  casesToUpdate: UpdateRequestWithOriginalCase[];
}) => {
  const invalidKeysPerCase: Record<string, string[]> = {};

  casesToUpdate.forEach(({ updateReq, originalCase }) => {
    if (updateReq.customFields) {
      invalidKeysPerCase[originalCase.id] = validateDuplicatedCustomFieldKeysInRequest({
        requestCustomFields: updateReq.customFields,
      });
    }
  });

  Object.keys(invalidKeysPerCase).forEach((caseId) => {
    if (invalidKeysPerCase[caseId].length) {
      throw Boom.badRequest(
        `The case with case id ${caseId} has the following duplicated custom field keys: ${invalidKeysPerCase[caseId]}`
      );
    }
  });
};

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const validateDuplicatedCustomFieldKeysInRequest = ({
  requestCustomFields = [],
}: {
  requestCustomFields?: Array<{ key: string }>;
}): string[] => {
  const uniqueKeys = new Set();
  const duplicatedKeys = new Set();

  requestCustomFields.forEach((item) => {
    if (uniqueKeys.has(item.key)) {
      duplicatedKeys.add(item.key);
    } else {
      uniqueKeys.add(item.key);
    }
  });

  return Array.from(duplicatedKeys.values()) as string[];
};
