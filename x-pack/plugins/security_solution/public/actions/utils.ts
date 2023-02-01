/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE, type Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { APP_UI_ID } from '../../common/constants';

/** all cell actions are disabled for these fields */
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
