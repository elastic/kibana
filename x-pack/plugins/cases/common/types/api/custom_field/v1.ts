/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../constants';
import { limitedStringSchema } from '../../../schema';

export const CaseCustomFieldTextWithValidationValueRt = (fieldName: string) =>
  limitedStringSchema({
    fieldName,
    min: 1,
    max: MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  });
