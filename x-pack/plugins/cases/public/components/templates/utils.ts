/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorsFormSerializer, isEmptyValue } from '../utils';
import type { TemplateFormProps } from './types';

export const removeEmptyFields = (
  fields: TemplateFormProps['caseFields'] | Record<string, string | boolean> | null | undefined
): TemplateFormProps['caseFields'] => {
  if (fields) {
    return Object.entries(fields).reduce((acc, [key, value]) => {
      let initialValue = {};

      if (key === 'customFields') {
        const nonEmptyFields = removeEmptyFields(value as Record<string, string | boolean>) ?? {};

        if (Object.entries(nonEmptyFields).length > 0) {
          initialValue = {
            customFields: nonEmptyFields,
          };
        }
      } else if (!isEmptyValue(value)) {
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

export const templateSerializer = <T extends TemplateFormProps | null>(data: T): T => {
  if (data !== null && data.caseFields) {
    const { fields, ...rest } = data.caseFields;
    const connectorFields = getConnectorsFormSerializer({ fields: fields ?? null });
    const serializedFields = removeEmptyFields(rest);

    return {
      ...data,
      caseFields: {
        ...serializedFields,
        fields: connectorFields.fields,
      } as TemplateFormProps['caseFields'],
    };
  }

  return data;
};

const isInvalidTag = (value: string) => value.trim() === '';

const isTagCharactersInLimit = (value: string, limit: number) => value.trim().length > limit;

export const validateEmptyTags = ({
  value,
  message,
}: {
  value: string | string[];
  message: string;
}) => {
  if (
    (!Array.isArray(value) && isInvalidTag(value)) ||
    (Array.isArray(value) && value.length > 0 && value.find(isInvalidTag))
  ) {
    return {
      message,
    };
  }
};

export const validateMaxLength = ({
  value,
  message,
  limit,
}: {
  value: string | string[];
  message: string;
  limit: number;
}) => {
  if (
    (!Array.isArray(value) && value.trim().length > limit) ||
    (Array.isArray(value) && value.length > 0 && value.some(isTagCharactersInLimit))
  ) {
    return {
      message,
    };
  }
};

export const validateMaxTagsLength = ({
  value,
  message,
  limit,
}: {
  value: string | string[];
  message: string;
  limit: number;
}) => {
  if (Array.isArray(value) && value.length > limit) {
    return {
      message,
    };
  }
};
