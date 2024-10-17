/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type DiffableRule,
  type RuleUpgradeInfoForReview,
} from '../../../../../common/api/detection_engine';
import type { FieldsUpgradeState } from './fields_upgrade_state';

export interface RuleUpgradeState extends RuleUpgradeInfoForReview {
  /**
   * Rule containing desired values users expect to see in the upgraded rule.
   */
  finalRule: DiffableRule;
  /**
   * Indicates whether there are conflicts blocking rule upgrading.
   */
  hasUnresolvedConflicts: boolean;
  /**
   * Stores a record of field names mapped to field upgrade state.
   */
  fieldsUpgradeState: FieldsUpgradeState;
}
