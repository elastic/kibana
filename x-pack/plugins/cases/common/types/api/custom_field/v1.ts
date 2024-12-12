/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  MAX_CUSTOM_FIELD_OPTION_LENGTH,
} from '../../../constants';
import { limitedStringSchema, limitedNumberAsIntegerSchema } from '../../../schema';

export const CaseCustomFieldTextWithValidationValueRt = (fieldName: string) =>
  limitedStringSchema({
    fieldName,
    min: 1,
    max: MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  });

export const CaseCustomFieldNumberWithValidationValueRt = ({ fieldName }: { fieldName: string }) =>
  limitedNumberAsIntegerSchema({
    fieldName,
  });

export const CaseCustomFieldListWithValidationValueRt = (fieldValue: string) =>
  new rt.Type(
    'CaseCustomFieldListWithValidationValueRt',
    rt.record(rt.string, rt.string).is,
    (input, context) => {
      if (typeof input !== 'object' || input === null) {
        return rt.failure(input, context, 'Value must be an object.');
      }

      if (Object.keys(input).length === 0) {
        return rt.failure(input, context, 'Value cannot be an empty object.');
      }

      if (Object.keys(input).length > 1) {
        return rt.failure(input, context, 'Value must be a single key/value pair.');
      }

      if (Object.values(input)[0].length > MAX_CUSTOM_FIELD_OPTION_LENGTH) {
        return rt.failure(
          input,
          context,
          `The length of the label is too long. The maximum length is ${MAX_CUSTOM_FIELD_OPTION_LENGTH}.`
        );
      }
      return rt.success(input);
    },
    rt.identity
  );
// rt.record(
//   rt.string,
//   limitedStringSchema({
//     fieldName: fieldValue,
//     min: 1,
//     max: MAX_CUSTOM_FIELD_OPTION_LENGTH,
//   })
// );

/**
 * Update custom_field
 */

export const CustomFieldPutRequestRt = rt.strict({
  value: rt.union([
    rt.boolean,
    rt.null,
    CaseCustomFieldTextWithValidationValueRt('value'),
    CaseCustomFieldNumberWithValidationValueRt({ fieldName: 'value' }),
    CaseCustomFieldListWithValidationValueRt('value'),
  ]),
  caseVersion: rt.string,
});

export type CustomFieldPutRequest = rt.TypeOf<typeof CustomFieldPutRequestRt>;
