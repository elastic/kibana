/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractSavedObjectReferences, resolveSavedObjectReferences } from '../../references';
import {
  extractLogIndicesSavedObjectReferences,
  resolveLogIndicesSavedObjectReferences,
} from './log_indices';

export const extractLogViewSavedObjectReferences = extractSavedObjectReferences([
  extractLogIndicesSavedObjectReferences,
]);

export const resolveLogViewSavedObjectReferences = resolveSavedObjectReferences([
  resolveLogIndicesSavedObjectReferences,
]);
