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

interface CustomFieldValidationParams {
  requestCustomFields?: CaseRequestCustomFields;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}

export const validateCustomFields = (params: CustomFieldValidationParams) => {
  validateDuplicatedCustomFieldKeysInRequest(params);
  validateCustomFieldKeysAgainstConfiguration(params);
  validateRequiredCustomFields(params);
  validateCustomFieldTypesInRequest(params);
};

/**
 * Returns a list of custom fields where the type doesn't match the configuration.
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

  if (invalidCustomFieldKeys.length) {
    throw Boom.badRequest(
      `The following custom fields have the wrong type in the request: ${invalidCustomFieldKeys}`
    );
  }
}

/**
 * Returns a list of custom fields in the request where the key doesn't match the configuration.
 */
export const validateCustomFieldKeysAgainstConfiguration = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) => {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return;
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
 */
export const validateRequiredCustomFields = ({
  requestCustomFields,
  customFieldsConfiguration,
}: CustomFieldValidationParams) => {
  if (!Array.isArray(requestCustomFields) || !requestCustomFields.length) {
    return;
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

  if (invalidCustomFieldKeys.length) {
    throw Boom.badRequest(`Missing required custom fields: ${invalidCustomFieldKeys}`);
  }
};

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const validateDuplicatedCustomFieldKeysInRequest = ({
  requestCustomFields = [],
}: {
  requestCustomFields?: Array<{ key: string }>;
}) => {
  const uniqueKeys = new Set<string>();
  const duplicatedKeys = new Set<string>();

  requestCustomFields.forEach((item) => {
    if (uniqueKeys.has(item.key)) {
      duplicatedKeys.add(item.key);
    } else {
      uniqueKeys.add(item.key);
    }
  });

  if (duplicatedKeys.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated custom field keys in request: ${Array.from(duplicatedKeys.values())}`
    );
  }
};
