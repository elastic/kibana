/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableAllFields } from '../../../../../common/api/detection_engine';
import type { FieldUpgradeState } from './field_upgrade_state';

export type FieldsUpgradeState = Record<
  string,
  | {
      state: Exclude<FieldUpgradeState, FieldUpgradeState.Accepted>;
    }
  | { state: FieldUpgradeState.Accepted; resolvedValue: DiffableAllFields[keyof DiffableAllFields] }
>;
