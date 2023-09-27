/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldConfiguration } from '../../../common/types/domain';
import type { CaseUICustomField } from '../../../common/ui';

export const addOrReplaceCustomField = (
  customFields: CaseUICustomField[] | CustomFieldConfiguration[],
  customFieldToAdd: CaseUICustomField | CustomFieldConfiguration
): CaseUICustomField[] | CustomFieldConfiguration[] => {
  const foundCustomFieldIndex = customFields.findIndex(
    (customField) => customField.key === customFieldToAdd.key
  );

  if (foundCustomFieldIndex === -1) {
    return [...customFields, customFieldToAdd] as CaseUICustomField[] | CustomFieldConfiguration[];
  }

  return customFields.map((customField) => {
    if (customField.key !== customFieldToAdd.key) {
      return customField;
    }

    return customFieldToAdd;
  }) as CaseUICustomField[] | CustomFieldConfiguration[];
};
