/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { RawRule, RuleTypeParams } from '../../types';

export function incrementRevision(
  currentRule: SavedObject<RawRule>,
  updatedParams: RuleTypeParams
): number {
  // TODO: Update logic as outlined in https://github.com/elastic/kibana/issues/137164
  // TODO: Potentially streamline with 'skipped logic' being introduced in https://github.com/elastic/kibana/pull/144461
  return currentRule.attributes.revision + 1;
}
