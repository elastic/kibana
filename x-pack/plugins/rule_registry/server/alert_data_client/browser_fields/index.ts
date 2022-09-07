/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldSpec } from '@kbn/data-views-plugin/server';
import { BrowserField } from '../../types';

const getFieldCategory = (fieldCapability: FieldSpec) => {
  const name = fieldCapability.name.split('.');
  if (name.length === 1) {
    return 'base';
  }

  return name[0];
};

const browserFieldFactory = (fieldCapability: FieldSpec) => {
  const category = getFieldCategory(fieldCapability);
  return {
    category,
    field: {
      [fieldCapability.name]: {
        ...fieldCapability,
        category,
      },
    },
  };
};

export const fieldDescriptorToBrowserFieldMapper = (
  fieldDescriptor: FieldSpec[]
): BrowserField[] => {
  const browserFields = new Map();

  fieldDescriptor.forEach((fieldCapability) => {
    const { category, field } = browserFieldFactory(fieldCapability);

    if (browserFields.has(category)) {
      const { fields: currentFields } = browserFields.get(category);
      browserFields.set(category, { fields: { ...currentFields, ...field } });
    } else {
      browserFields.set(category, { fields: field });
    }
  });

  return Object.fromEntries(browserFields);
};
