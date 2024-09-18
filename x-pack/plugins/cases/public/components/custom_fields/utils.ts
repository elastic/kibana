/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmptyString } from '@kbn/es-ui-shared-plugin/static/validators/string';
import { isString } from 'lodash';
import type { CustomFieldConfiguration } from '../../../common/types/domain';

export const customFieldSerializer = (
  field: CustomFieldConfiguration
): CustomFieldConfiguration => {
  const { defaultValue, ...otherProperties } = field;

  if (defaultValue === undefined || (isString(defaultValue) && isEmptyString(defaultValue))) {
    return otherProperties;
  }

  return field;
};
