/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { get, isEqual } from 'lodash';
import { RuleTypeParams } from '../../types';
import { fieldsToExcludeFromRevisionUpdates } from '..';
import { UpdateRuleData } from '../../application/rule/methods/update';
import { RuleAttributes } from '../../data/rule/types';

export function incrementRevision<Params extends RuleTypeParams>({
  originalRuleSavedObject,
  updateRuleData,
  updatedParams,
}: {
  originalRuleSavedObject: SavedObject<RuleAttributes>;
  updateRuleData: UpdateRuleData<Params>;
  updatedParams: RuleTypeParams;
}): number {
  // Diff root level attrs
  for (const [field, value] of Object.entries(updateRuleData).filter(([key]) => key !== 'params')) {
    if (
      !fieldsToExcludeFromRevisionUpdates.has(field) &&
      !isEqual(value, get(originalRuleSavedObject.attributes, field))
    ) {
      return originalRuleSavedObject.attributes.revision + 1;
    }
  }

  // Diff rule params
  for (const [field, value] of Object.entries(updatedParams)) {
    if (
      !fieldsToExcludeFromRevisionUpdates.has(field) &&
      !isEqual(value, get(originalRuleSavedObject.attributes.params, field))
    ) {
      return originalRuleSavedObject.attributes.revision + 1;
    }
  }
  return originalRuleSavedObject.attributes.revision;
}
