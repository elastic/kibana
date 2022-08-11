/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldSpec } from '@kbn/data-views-plugin/server';
import { BrowserField, FieldInfo } from '../../types';

import { fieldsBeat } from './fields';
const beatsMap = new Map(Object.entries(fieldsBeat));

const populatedFieldInfoFactory = (fieldCapability: FieldSpec, beat: FieldInfo) => {
  const { category, description, example, name } = beat;
  const { aggregatable, readFromDocValues, searchable, type } = fieldCapability;

  return {
    category,
    field: {
      [name]: {
        aggregatable,
        category,
        description,
        example,
        name,
        readFromDocValues,
        searchable,
        type,
      },
    },
  };
};

const emptyFieldInfoFactory = (fieldCapability: FieldSpec) => {
  const category = fieldCapability.name.split('.')[0];
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

export const fieldDescriptorToBrowserFieldMapper = async (
  fieldDescriptor: FieldSpec[]
): Promise<BrowserField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const browserFields = new Map();

      fieldDescriptor.forEach((fieldCapability) => {
        const beat = beatsMap.get(fieldCapability.name);
        const { category, field } = beat
          ? populatedFieldInfoFactory(fieldCapability, beat)
          : emptyFieldInfoFactory(fieldCapability);

        if (browserFields.has(category)) {
          const { fields: currentFields } = browserFields.get(category);
          browserFields.set(category, { fields: { ...currentFields, ...field } });
        } else {
          browserFields.set(category, { fields: field });
        }
      });

      resolve(Object.fromEntries(browserFields));
    });
  });
};
