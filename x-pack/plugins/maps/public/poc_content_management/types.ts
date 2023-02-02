/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSimpleSavedObject } from '@kbn/core-saved-objects-api-browser';
import type { SimpleSavedObjectImpl } from './legacy_saved_object';

export interface MapGetOut {
  saved_object: SimpleSavedObjectImpl;
  outcome: ResolvedSimpleSavedObject['outcome'];
  alias_purpose?: ResolvedSimpleSavedObject['alias_purpose'];
  alias_target_id?: string;
}
