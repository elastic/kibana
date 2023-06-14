/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE, type Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import type { Serializable } from '@kbn/utility-types';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { APP_UI_ID } from '../../common/constants';

// All cell actions are disabled for these fields in Security
const FIELDS_WITHOUT_CELL_ACTIONS = [
  'signal.rule.risk_score',
  'kibana.alert.risk_score',
  'signal.reason',
  'kibana.alert.reason',
];

export const isInSecurityApp = (currentAppId?: string): boolean => {
  return !!currentAppId && currentAppId === APP_UI_ID;
};

export const isLensEmbeddable = (embeddable: IEmbeddable): embeddable is LensEmbeddable => {
  return embeddable.type === LENS_EMBEDDABLE_TYPE;
};

export const fieldHasCellActions = (field?: string): boolean => {
  return !!field && !FIELDS_WITHOUT_CELL_ACTIONS.includes(field);
};

export const isCountField = (
  fieldType: string | undefined,
  sourceParamType: Serializable | undefined
) => {
  return fieldType === 'number' && sourceParamType === 'value_count';
};

const SUPPORTED_LENS_TYPES = new Set([
  KBN_FIELD_TYPES.STRING,
  KBN_FIELD_TYPES.BOOLEAN,
  KBN_FIELD_TYPES.NUMBER,
  KBN_FIELD_TYPES.IP,
]);

export const isLensSupportedType = (fieldType: string | undefined) =>
  fieldType ? SUPPORTED_LENS_TYPES.has(fieldType as KBN_FIELD_TYPES) : false;
