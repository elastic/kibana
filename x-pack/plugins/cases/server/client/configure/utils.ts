/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';
import type { CustomFieldsConfigurationRequest } from '../../../common/types/api';
import { DEFAULT_VALUE_TEXT, DEFAULT_VALUE_TOGGLE } from '../../common/constants';

export const fillMissingDefaultValues = ({
  customFields = [],
}: {
  customFields?: CustomFieldsConfigurationRequest;
}): CustomFieldsConfigurationRequest => {
  return customFields.map((customField) => {
    if (
      customField.required &&
      (customField.defaultValue === undefined || customField.defaultValue === null)
    ) {
      return {
        ...customField,
        defaultValue:
          customField.type === CustomFieldTypes.TEXT ? DEFAULT_VALUE_TEXT : DEFAULT_VALUE_TOGGLE,
      } as CustomFieldsConfigurationRequest[number];
    }

    return customField;
  });
};
