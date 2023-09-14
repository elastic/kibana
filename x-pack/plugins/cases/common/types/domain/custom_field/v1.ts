/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';

import { MAX_CUSTOM_FIELD_LABEL_LENGTH } from '../../../constants';
import { limitedStringSchema } from '../../../schema';

export enum CustomFieldTypes {
  TEXT = 'text',
  TOGGLE = 'toggle',
  LIST = 'list',
}

export const CustomFieldTextTypeRt = rt.literal(CustomFieldTypes.TEXT);
export const CustomFieldToggleTypeRt = rt.literal(CustomFieldTypes.TOGGLE);
export const CustomFieldListTypeRt = rt.literal(CustomFieldTypes.LIST);

export const CustomFieldRt = rt.strict({
  /**
   * key of custom field
   */
  key: rt.string,
  /**
   * label of custom field
   */
  label: limitedStringSchema({ fieldName: 'label', min: 1, max: MAX_CUSTOM_FIELD_LABEL_LENGTH }),
  /**
   * custom field options - required
   */
  required: rt.boolean,
});

export const TextCustomFieldRt = rt.intersection([
  rt.strict({ type: CustomFieldTextTypeRt }),
  CustomFieldRt,
]);

export const ToggleCustomFieldRt = rt.intersection([
  rt.strict({ type: CustomFieldToggleTypeRt }),
  CustomFieldRt,
]);

export const ListCustomFieldRt = rt.intersection([
  rt.strict({ type: CustomFieldListTypeRt, options: rt.array(rt.string) }),
  CustomFieldRt,
]);

export type CustomField = rt.TypeOf<typeof CustomFieldRt>;
export type TextCustomField = rt.TypeOf<typeof TextCustomFieldRt>;
export type ListCustomField = rt.TypeOf<typeof ListCustomFieldRt>;
export type ToggleCustomField = rt.TypeOf<typeof ToggleCustomFieldRt>;
