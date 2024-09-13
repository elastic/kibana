/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableRule } from '../../../../../common/api/detection_engine';
import type { SetFieldResolvedValueFn } from '../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';

interface ThreeWayDiffTabProps {
  finalDiffableRule: DiffableRule;
  setFieldResolvedValue: SetFieldResolvedValueFn;
}

export function ThreeWayDiffTab({
  finalDiffableRule,
  setFieldResolvedValue,
}: ThreeWayDiffTabProps): JSX.Element {
  return <>{JSON.stringify(finalDiffableRule)}</>;
}
