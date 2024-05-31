/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
import { RuleTypeParams } from '../../types';
import { fieldsToExcludeFromRevisionUpdates } from '..';
import { UpdateRuleData } from '../../application/rule/methods/update';
import { RuleAttributes } from '../../data/rule/types';

export function incrementRevision<Params extends RuleTypeParams>({
  originalRule,
  updateRuleData,
  updatedParams,
}: {
  originalRule: RuleAttributes;
  updateRuleData: UpdateRuleData<Params>;
  updatedParams: RuleTypeParams;
}): number {
  // Diff root level attrs
  for (const [field, value] of Object.entries(updateRuleData).filter(([key]) => key !== 'params')) {
    if (
      !fieldsToExcludeFromRevisionUpdates.has(field) &&
      !isEqual(value, get(originalRule, field))
    ) {
      return originalRule.revision + 1;
    }
  }

  // Diff rule params
  for (const [field, value] of Object.entries(updatedParams)) {
    if (
      !fieldsToExcludeFromRevisionUpdates.has(field) &&
      !isEqual(value, get(originalRule.params, field))
    ) {
      return originalRule.revision + 1;
    }
  }
  return originalRule.revision;
}
