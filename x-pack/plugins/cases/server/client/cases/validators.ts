/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { differenceWith, intersectionWith, isEmpty } from 'lodash';
import Boom from '@hapi/boom';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type { CaseRequestCustomFields, CasesSearchRequest } from '../../../common/types/api';
import { validateDuplicatedKeysInRequest } from '../validators';
import type { ICasesCustomField } from '../../custom_fields';
import { casesCustomFields } from '../../custom_fields';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';

interface CustomFieldValidationParams {
  requestCustomFields?: CaseRequestCustomFields;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}

export const validateCustomFields = (params: CustomFieldValidationParams) => {
  validateDuplicatedKeysInRequest({
    requestFields: params.requestCustomFields,
    fieldName: 'customFields',
  });
  validateCustomFieldKeysAgainstConfiguration(params);
  validateRequiredCustomFields(params);
  validateCustomFieldTypesInRequest(params);
};

/**
 * Throws if the type doesn't match the configuration.
 */
export function validateCustomFieldTypesInRequest({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return;
  }

  if (customFieldsConfiguration === undefined) {
    throw Boom.badRequest('No custom fields configured.');
  }

  const invalidCustomFields = intersectionWith(
    customFieldsConfiguration,
    requestCustomFields,
    (requiredVal, requestedVal) =>
      requiredVal.key === requestedVal.key && requiredVal.type !== requestedVal.type
  ).map((config) => `"${config.label ? config.label : 'Unknown'}"`);

  if (invalidCustomFields.length) {
    throw Boom.badRequest(
      `The following custom fields have the wrong type in the request: ${invalidCustomFields.join(
        ', '
      )}`
    );
  }
}

/**
 * Throws if the key doesn't match the configuration or is missing
 */
export const validateCustomFieldKeysAgainstConfiguration = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) => {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return [];
  }

  if (customFieldsConfiguration === undefined) {
    throw Boom.badRequest('No custom fields configured.');
  }

  const invalidCustomFieldKeys = differenceWith(
    requestCustomFields,
    customFieldsConfiguration,
    (requestVal, configurationVal) => requestVal.key === configurationVal.key
  ).map((e) => e.key);

  if (invalidCustomFieldKeys.length) {
    throw Boom.badRequest(`Invalid custom field keys: ${invalidCustomFieldKeys}`);
  }
};

/**
 * Returns a list of required custom fields missing from the request
 * that don't have a default value configured.
 */
export const validateRequiredCustomFields = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) => {
  if (customFieldsConfiguration === undefined) {
    if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
      return;
    } else {
      throw Boom.badRequest('No custom fields configured.');
    }
  }

  const requiredCustomFields = customFieldsConfiguration.filter(
    (customField) => customField.required
  );

  if (!requiredCustomFields.length) {
    return;
  }

  const missingRequiredCustomFields = differenceWith(
    requiredCustomFields,
    requestCustomFields ?? [],
    (configuration, request) => configuration.key === request.key
  ) // missing custom field and missing defaultValue -> error
    .filter(
      (customField) => customField.defaultValue === undefined || customField.defaultValue === null
    )
    .map((e) => `"${e.label}"`);

  if (missingRequiredCustomFields.length) {
    throw Boom.badRequest(
      `Missing required custom fields without default value configured: ${missingRequiredCustomFields.join(
        ', '
      )}`
    );
  }

  const nullRequiredCustomFields = requiredCustomFields
    .filter((requiredField) => {
      const found = requestCustomFields?.find(
        (requestField) => requestField.key === requiredField.key
      );

      // required custom fields cannot be set to null
      return found && found.value === null;
    })
    .map((e) => `"${e.label}"`);

  if (nullRequiredCustomFields.length) {
    throw Boom.badRequest(
      `Invalid value "null" supplied for the following required custom fields: ${nullRequiredCustomFields.join(
        ', '
      )}`
    );
  }
};

export const validateSearchCasesCustomFields = ({
  customFieldsConfiguration,
  customFields,
}: {
  customFieldsConfiguration: CustomFieldsConfiguration;
  customFields: CasesSearchRequest['customFields'];
}) => {
  let customFieldsMapping: ICasesCustomField | null = null;

  if (!customFields || isEmpty(customFields)) {
    return;
  }

  if (!customFieldsConfiguration.length) {
    throw Boom.badRequest('No custom fields configured.');
  }

  if (Object.keys(customFields).length > MAX_CUSTOM_FIELDS_PER_CASE) {
    throw Boom.badRequest(`Maximum ${MAX_CUSTOM_FIELDS_PER_CASE} customFields are allowed.`);
  }

  Object.entries(customFields).forEach(([key, value]) => {
    const customFieldConfig = customFieldsConfiguration.find((config) => config.key === key);

    if (!customFieldConfig) {
      throw Boom.badRequest(`Invalid custom field key: ${key}.`);
    }

    customFieldsMapping = casesCustomFields.get(customFieldConfig.type);

    if (!customFieldsMapping?.isFilterable) {
      throw Boom.badRequest(
        `Filtering by custom field of type ${customFieldConfig.type} is not allowed.`
      );
    }

    customFieldsMapping?.validateFilteringValues(value);
  });
};
