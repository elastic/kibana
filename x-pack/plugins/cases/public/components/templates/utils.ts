/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateConfiguration } from '../../../common/types/domain';
import { isEmptyValue } from '../utils';

export const removeEmptyFields = (
  fields: TemplateConfiguration['caseFields'] | Record<string, string | boolean> | null | undefined
): TemplateConfiguration['caseFields'] => {
  if (fields) {
    return Object.entries(fields).reduce((acc, [key, value]) => {
      let initialValue = {};

      if (key === 'customFields') {
        const nonEmptyFields = removeEmptyFields(value) ?? {};

        if (Object.entries(nonEmptyFields).length > 0) {
          initialValue = {
            customFields: nonEmptyFields,
          };
        }
      }

      if (key !== 'customFields' && !isEmptyValue(value)) {
        initialValue = { [key]: value };
      }

      return {
        ...acc,
        ...initialValue,
      };
    }, {});
  }

  return null;
};

export const templateFormSerializer = <T extends TemplateConfiguration>(data: T): T => {
  if (data.caseFields) {
    const serializedFields = removeEmptyFields(data.caseFields);

    return {
      ...data,
      caseFields: serializedFields as TemplateConfiguration['caseFields'],
    };
  }

  return data;
};
