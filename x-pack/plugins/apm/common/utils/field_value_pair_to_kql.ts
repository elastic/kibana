/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import { isEmpty, isNil } from 'lodash';

export function fieldValuePairToKql<T extends string>(
  field: T,
  value: string | boolean | number | undefined | null
) {
  if (isNil(value) || isEmpty(value)) {
    return [];
  }

  const escapedValue = escapeKuery(value.toString());

  return [`${[field]}: ${escapedValue}`];
}
