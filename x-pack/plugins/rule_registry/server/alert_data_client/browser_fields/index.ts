/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { BrowserFields, BrowserField } from '../../../common';

const getFieldCategory = (fieldCapability: FieldDescriptor) => {
  const name = fieldCapability.name.split('.');

  if (name.length === 1) {
    return 'base';
  }

  return name[0];
};

const browserFieldFactory = (
  fieldCapability: FieldDescriptor,
  category: string
): Readonly<Record<string, Partial<BrowserField>>> => {
  return {
    [fieldCapability.name]: {
      ...fieldCapability,
      category,
    },
  };
};

export const fieldDescriptorToBrowserFieldMapper = (fields: FieldDescriptor[]): BrowserFields => {
  return fields.reduce((browserFields: BrowserFields, field: FieldDescriptor) => {
    const category = getFieldCategory(field);
    const browserField = browserFieldFactory(field, category);

    if (browserFields[category] && browserFields[category]) {
      Object.assign(browserFields[category].fields || {}, browserField);
    } else {
      browserFields[category] = { fields: browserField };
    }

    return browserFields;
  }, {});
};
