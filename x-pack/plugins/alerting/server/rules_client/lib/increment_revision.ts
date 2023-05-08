/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { get, isEqual } from 'lodash';
import { RawRule, RuleTypeParams } from '../../types';
import { fieldsToExcludeFromRevisionUpdates, UpdateOptions } from '..';

export function incrementRevision<Params extends RuleTypeParams>(
  currentRule: SavedObject<RawRule>,
  { data }: UpdateOptions<Params>,
  updatedParams: RuleTypeParams
): number {
  // Diff root level attrs
  for (const [field, value] of Object.entries(data).filter(([key]) => key !== 'params')) {
    if (
      !fieldsToExcludeFromRevisionUpdates.has(field) &&
      !isEqual(value, get(currentRule.attributes, field))
    ) {
      return currentRule.attributes.revision + 1;
    }
  }

  // Diff rule params
  for (const [field, value] of Object.entries(updatedParams)) {
    if (
      !fieldsToExcludeFromRevisionUpdates.has(field) &&
      !isEqual(value, get(currentRule.attributes.params, field))
    ) {
      return currentRule.attributes.revision + 1;
    }
  }
  return currentRule.attributes.revision;
}
