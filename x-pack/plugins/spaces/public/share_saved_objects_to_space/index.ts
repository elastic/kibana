/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getShareToSpaceFlyoutComponent,
  getLegacyUrlConflict,
  getSavedObjectConflictMessage,
} from './components';
export { createRedirectLegacyUrl } from './utils';
export type {
  LegacyUrlConflictProps,
  ShareToSpaceFlyoutProps,
  ShareToSpaceSavedObjectTarget,
  SavedObjectConflictMessageProps,
} from './types';
