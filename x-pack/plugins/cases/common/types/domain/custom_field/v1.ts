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

export const CaseCustomFieldRt = rt.union([CaseCustomFieldTextRt, CaseCustomFieldToggleRt]);
export const CaseCustomFieldsRt = rt.array(CaseCustomFieldRt);

export type CaseCustomFields = rt.TypeOf<typeof CaseCustomFieldsRt>;
export type CaseCustomField = rt.TypeOf<typeof CaseCustomFieldRt>;
export type CaseCustomFieldToggle = rt.TypeOf<typeof CaseCustomFieldToggleRt>;
export type CaseCustomFieldText = rt.TypeOf<typeof CaseCustomFieldTextRt>;
