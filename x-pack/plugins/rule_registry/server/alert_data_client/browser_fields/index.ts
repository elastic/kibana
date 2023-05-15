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

const chunkFields = (fields: FieldDescriptor[]) => {
  const chunkSize = 100;
  const chunks = [];
  for (let i = 0; i < fields.length; i += chunkSize) {
    chunks.push(fields.slice(i, i + chunkSize));
  }
  return chunks;
};

export const mergerBrowserField = (AllBrowserFields: BrowserFields[]): BrowserFields => {
  const results: BrowserFields = {};
  for (const browserFields of AllBrowserFields) {
    for (const [key, value] of Object.entries(browserFields)) {
      if (results[key]) {
        results[key] = {
          fields: {
            ...(results[key] && results[key].fields ? results[key].fields : {}),
            ...value.fields,
          },
        };
      } else {
        results[key] = value;
      }
    }
  }
  return results;
};

export const fieldDescriptorToBrowserFieldMapper = async (
  fields: FieldDescriptor[]
): Promise<BrowserFields> => {
  const mappedFields: BrowserFields[] = await Promise.all<BrowserFields>(
    chunkFields(fields).map((cFields) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            cFields.reduce<BrowserFields>(
              (browserFields: BrowserFields, field: FieldDescriptor) => {
                const category = getFieldCategory(field);
                const browserField = browserFieldFactory(field, category);

                if (browserFields[category]) {
                  browserFields[category] = {
                    fields: { ...browserFields[category].fields, ...browserField },
                  };
                } else {
                  browserFields[category] = { fields: browserField };
                }

                return browserFields;
              },
              {}
            )
          );
        });
      });
    })
  );
  return mergerBrowserField(mappedFields);
};
