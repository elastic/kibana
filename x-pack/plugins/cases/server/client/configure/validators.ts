/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CustomFieldTypes } from '../../../common/types/domain';

/**
 * Throws an error if the request tries to change the type of existing custom fields.
 */
export const validateCustomFieldTypesInRequest = ({
  requestCustomFields,
  originalCustomFields,
}: {
  requestCustomFields?: Array<{ key: string; type: CustomFieldTypes }>;
  originalCustomFields: Array<{ key: string; type: CustomFieldTypes }>;
}) => {
  if (!Array.isArray(requestCustomFields) || !originalCustomFields.length) {
    return;
  }

  const invalidFields: string[] = [];

  requestCustomFields.forEach((requestField) => {
    const originalField = originalCustomFields.find((item) => item.key === requestField.key);

    if (originalField && originalField.type !== requestField.type) {
      invalidFields.push(requestField.key);
    }
  });

  if (invalidFields.length > 0) {
    throw Boom.badRequest(
      `Invalid custom field types in request for the following keys: ${invalidFields}`
    );
  }
};

/**
 * Throws an error if any required custom field is missing the default value.
 */
export const validateRequiredCustomFieldInRequest = ({
  requestCustomFields,
}: {
  requestCustomFields?: Array<{
    key: string;
    required: boolean;
    default_value?: string | boolean | null;
  }>;
}) => {
  if (!Array.isArray(requestCustomFields)) {
    return;
  }

  const invalidFields: string[] = [];

  requestCustomFields.forEach((requestField) => {
    if (
      requestField.required &&
      (requestField.default_value === undefined || requestField.default_value === null)
    ) {
      invalidFields.push(requestField.key);
    }
  });

  if (invalidFields.length > 0) {
    throw Boom.badRequest(
      `The following required custom fields are missing the default value: ${invalidFields}`
    );
  }
};
