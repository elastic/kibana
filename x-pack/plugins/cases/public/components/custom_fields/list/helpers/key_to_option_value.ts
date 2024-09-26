/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListCustomFieldOption } from '../../../../../common/types/domain';

export const keyToOptionValue = (key: string, fieldOptions: ListCustomFieldOption[]): string[] => {
  const option = fieldOptions.find((opt) => opt.key === key);
  return option ? [option.key, option.label] : [key, key];
};
