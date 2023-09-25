/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';

export enum CustomFieldTypes {
  TEXT = 'text',
  TOGGLE = 'toggle',
}

export const CustomFieldTextTypeRt = rt.literal(CustomFieldTypes.TEXT);
export const CustomFieldToggleTypeRt = rt.literal(CustomFieldTypes.TOGGLE);

export const createCustomFieldValueRt = <C extends rt.Mixed>(codec: C) =>
  rt.strict({ value: rt.union([rt.array(codec), rt.null]) });

const CaseCustomFieldText = rt.strict({
  key: rt.string,
  type: CustomFieldTextTypeRt,
  field: createCustomFieldValueRt(rt.string),
});

export const CaseCustomFieldToggle = rt.strict({
  key: rt.string,
  type: CustomFieldToggleTypeRt,
  field: createCustomFieldValueRt(rt.boolean),
});

export const CaseCustomFieldRt = rt.union([CaseCustomFieldText, CaseCustomFieldToggle]);
export const CaseCustomFieldsRt = rt.array(CaseCustomFieldRt);

export type CaseCustomFields = rt.TypeOf<typeof CaseCustomFieldsRt>;
export type CaseCustomField = rt.TypeOf<typeof CaseCustomFieldRt>;
