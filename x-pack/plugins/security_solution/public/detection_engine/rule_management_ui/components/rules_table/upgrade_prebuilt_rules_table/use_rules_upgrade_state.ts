/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type {
  DiffableAllFields,
  RuleObjectId,
} from '../../../../../../common/api/detection_engine';

interface RuleUpgradeState {
  fields: Partial<DiffableAllFields>;
}

type RulesUpgradeState = Record<string, RuleUpgradeState>;

export type SetFieldResolvedValueFn<
  FieldName extends keyof DiffableAllFields = keyof DiffableAllFields
> = (params: {
  ruleId: RuleObjectId;
  fieldName: FieldName;
  resolvedValue: DiffableAllFields[FieldName];
}) => void;

interface UseRulesUpgradeStateResult {
  rulesUpgradeState: RulesUpgradeState;
  setFieldResolvedValue: SetFieldResolvedValueFn;
}

export function useRulesUpgradeState(): UseRulesUpgradeStateResult {
  const [rulesUpgradeState, setRulesUpgradeState] = useState<RulesUpgradeState>({});
  const setFieldResolvedValue = useCallback(
    (...[params]: Parameters<SetFieldResolvedValueFn>) => {
      setRulesUpgradeState((prevRulesUpgradeState) => ({
        ...prevRulesUpgradeState,
        [params.ruleId]: {
          ...(prevRulesUpgradeState[params.ruleId] ?? {}),
          fieldName: params.resolvedValue,
        },
      }));
    },
    [setRulesUpgradeState]
  );

  return {
    rulesUpgradeState,
    setFieldResolvedValue,
  };
}
