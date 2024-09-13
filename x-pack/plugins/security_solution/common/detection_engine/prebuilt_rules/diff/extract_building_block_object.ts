/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildingBlockObject } from '../../../api/detection_engine/prebuilt_rules';
import type { DiffableRuleInput } from './types';

export const extractBuildingBlockObject = (
  rule: DiffableRuleInput
): BuildingBlockObject | undefined => {
  if (rule.building_block_type == null) {
    return undefined;
  }
  return {
    type: rule.building_block_type,
  };
};
