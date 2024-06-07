/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmptyString } from '@kbn/es-ui-shared-plugin/static/validators/string';
import { isString } from 'lodash';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import type { CasesConfigurationUI, CaseUI, CaseUICustomField } from '../../containers/types';
import { convertCustomFieldValue } from '../utils';

export const customFieldSerializer = (
  field: CustomFieldConfiguration
): CustomFieldConfiguration => {
  const { defaultValue, ...otherProperties } = field;

  if (defaultValue === undefined || (isString(defaultValue) && isEmptyString(defaultValue))) {
    return otherProperties;
  }

  return field;
};

export const transformCustomFieldsData = (
  customFields: Record<string, string | boolean>,
  selectedCustomFieldsConfiguration: CasesConfigurationUI['customFields']
) => {
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
        value: convertCustomFieldValue(value),
      } as CaseUICustomField);
    }
  }

  return transformedCustomFields;
};
