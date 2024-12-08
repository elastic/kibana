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
  LIST = 'list',
  NUMBER = 'number',
}

export const CustomFieldTextTypeRt = rt.literal(CustomFieldTypes.TEXT);
export const CustomFieldToggleTypeRt = rt.literal(CustomFieldTypes.TOGGLE);
export const CustomFieldListTypeRt = rt.literal(CustomFieldTypes.LIST);
export const CustomFieldNumberTypeRt = rt.literal(CustomFieldTypes.NUMBER);

const CaseCustomFieldTextRt = rt.strict({
  key: rt.string,
  type: CustomFieldTextTypeRt,
  value: rt.union([rt.string, rt.null]),
});

export const CaseCustomFieldToggleRt = rt.strict({
  key: rt.string,
  type: CustomFieldToggleTypeRt,
  value: rt.union([rt.boolean, rt.null]),
});

export const CaseCustomFieldListRt = rt.strict({
  key: rt.string,
  type: CustomFieldListTypeRt,
  value: rt.union([rt.record(rt.string, rt.string), rt.null]),
});

export const CaseCustomFieldNumberRt = rt.strict({
  key: rt.string,
  type: CustomFieldNumberTypeRt,
  value: rt.union([rt.number, rt.null]),
});

export const CaseCustomFieldRt = rt.union([
  CaseCustomFieldTextRt,
  CaseCustomFieldToggleRt,
  CaseCustomFieldNumberRt,
  CaseCustomFieldListRt,
]);
export const CaseCustomFieldsRt = rt.array(CaseCustomFieldRt);

export const CustomFieldValueRt = rt.union([
  rt.string,
  rt.number,
  rt.boolean,
  rt.record(rt.string, rt.string),
  rt.null,
]);
export type CustomFieldValue = rt.TypeOf<typeof CustomFieldValueRt>;

export type CaseCustomFields = rt.TypeOf<typeof CaseCustomFieldsRt>;
export type CaseCustomField = rt.TypeOf<typeof CaseCustomFieldRt>;

export type CaseCustomFieldToggle = rt.TypeOf<typeof CaseCustomFieldToggleRt>;
export type CaseCustomFieldText = rt.TypeOf<typeof CaseCustomFieldTextRt>;
export type CaseCustomFieldList = rt.TypeOf<typeof CaseCustomFieldListRt>;
export type CaseCustomFieldNumber = rt.TypeOf<typeof CaseCustomFieldNumberRt>;
