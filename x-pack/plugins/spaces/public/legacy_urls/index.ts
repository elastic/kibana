/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getEmbeddableLegacyUrlConflict, getLegacyUrlConflict } from './components';
export { createRedirectLegacyUrl } from './redirect_legacy_url';

export type {
  EmbeddableLegacyUrlConflictProps,
  LegacyUrlConflictProps,
  RedirectLegacyUrlParams,
} from './types';
