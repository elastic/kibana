/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { BrowserFields } from '../../../common';

const getFieldCategory = (fieldCapability: FieldDescriptor) => {
  const name = fieldCapability.name.split('.');

  if (name.length === 1) {
    return 'base';
  }

  return name[0];
};

export const fieldDescriptorToBrowserFieldMapper = (fields: FieldDescriptor[]): BrowserFields => {
  return fields.reduce((browserFields: BrowserFields, field: FieldDescriptor) => {
    const category = getFieldCategory(field);
    const browserField = {
      ...field,
      category,
    };

    if (browserFields[category] && browserFields[category].fields) {
      browserFields[category].fields[field.name] = browserField;
    } else {
      browserFields[category] = { fields: { [field.name]: browserField } };
    }

    return browserFields;
  }, {});
};
