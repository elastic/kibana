/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';

export interface InternalLegacyUrlAliasTarget extends LegacyUrlAliasTarget {
  /**
   * We could potentially have an alias for a space that does not exist; in that case, we may need disable it, but we don't want to show it
   * in the UI.
   */
  spaceExists: boolean;
}
