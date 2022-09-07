/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldSpec } from '@kbn/data-plugin/common';
import { BrowserField, BrowserFields } from '../../types';

const getFieldCategory = (fieldCapability: FieldSpec) => {
  const name = fieldCapability.name.split('.');

  if (name.length === 1) {
    return 'base';
  }

  return name[0];
};

const browserFieldFactory = (
  fieldCapability: FieldSpec,
  category: string
): { [fieldName in string]: BrowserField } => {
  return {
    [fieldCapability.name]: {
      ...fieldCapability,
      category,
    },
  };
};

export const fieldDescriptorToBrowserFieldMapper = (
  fieldDescriptor: FieldSpec[]
): BrowserFields => {
  return fieldDescriptor.reduce((browserFields: BrowserFields, fieldCapability: FieldSpec) => {
    const category = getFieldCategory(fieldCapability);
    const field = browserFieldFactory(fieldCapability, category);

    if (browserFields[category]) {
      browserFields[category] = { fields: { ...browserFields[category].fields, ...field } };
    } else {
      browserFields[category] = { fields: field };
    }

    return browserFields;
  }, {});
};
