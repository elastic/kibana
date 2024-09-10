/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { FieldsDiff } from '../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffConflict,
  type DiffableAllFields,
  type DiffableRule,
  type RuleObjectId,
  type RuleSignatureId,
  type RuleUpgradeInfoForReview,
} from '../../../../../../common/api/detection_engine';
import { convertRuleToDiffable } from '../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';

export interface RuleUpgradeState extends RuleUpgradeInfoForReview {
  /**
   * Rule containing desired values users expect to see in the upgraded rule.
   */
  finalRule: DiffableRule;
  /**
   * Indicates whether there are conflicts blocking rule upgrading.
   */
  hasUnresolvedConflicts: boolean;
}
export type RulesUpgradeState = Record<RuleSignatureId, RuleUpgradeState>;
export type SetFieldResolvedValueFn<
  FieldName extends keyof DiffableAllFields = keyof DiffableAllFields
> = (params: {
  ruleId: RuleObjectId;
  fieldName: FieldName;
  resolvedValue: DiffableAllFields[FieldName];
}) => void;

type RuleResolvedConflicts = Partial<DiffableAllFields>;
type RulesResolvedConflicts = Record<string, RuleResolvedConflicts>;

interface UseRulesUpgradeStateResult {
  rulesUpgradeState: RulesUpgradeState;
  setFieldResolvedValue: SetFieldResolvedValueFn;
}

export function usePrebuiltRulesUpgradeState(
  ruleUpgradeInfos: RuleUpgradeInfoForReview[]
): UseRulesUpgradeStateResult {
  const [rulesResolvedConflicts, setRulesResolvedConflicts] = useState<RulesResolvedConflicts>({});
  const setFieldResolvedValue = useCallback((...[params]: Parameters<SetFieldResolvedValueFn>) => {
    setRulesResolvedConflicts((prevRulesResolvedConflicts) => ({
      ...prevRulesResolvedConflicts,
      [params.ruleId]: {
        ...(prevRulesResolvedConflicts[params.ruleId] ?? {}),
        [params.fieldName]: params.resolvedValue,
      },
    }));
  }, []);
  const rulesUpgradeState = useMemo(() => {
    const state: RulesUpgradeState = {};

    for (const ruleUpgradeInfo of ruleUpgradeInfos) {
      state[ruleUpgradeInfo.rule_id] = {
        ...ruleUpgradeInfo,
        finalRule: calcFinalDiffableRule(
          ruleUpgradeInfo,
          rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
        ),
        hasUnresolvedConflicts:
          getUnacceptedConflictsCount(
            ruleUpgradeInfo.diff.fields,
            rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
          ) > 0,
      };
    }

    return state;
  }, [ruleUpgradeInfos, rulesResolvedConflicts]);

  return {
    rulesUpgradeState,
    setFieldResolvedValue,
  };
}

function calcFinalDiffableRule(
  ruleUpgradeInfo: RuleUpgradeInfoForReview,
  ruleResolvedConflicts: RuleResolvedConflicts
): DiffableRule {
  return {
    ...convertRuleToDiffable(ruleUpgradeInfo.target_rule),
    ...convertRuleFieldsDiffToDiffable(ruleUpgradeInfo.diff.fields),
    ...ruleResolvedConflicts,
  } as DiffableRule;
}

/**
 * Assembles a `DiffableRule` from rule fields diff `merge_value`s.
 */
function convertRuleFieldsDiffToDiffable(
  ruleFieldsDiff: FieldsDiff<Record<string, unknown>>
): Partial<DiffableRule> {
  const mergeVersionRule: Record<string, unknown> = {};

  for (const fieldName of Object.keys(ruleFieldsDiff)) {
    mergeVersionRule[fieldName] = ruleFieldsDiff[fieldName].merged_version;
  }

  return mergeVersionRule;
}

function getUnacceptedConflictsCount(
  ruleFieldsDiff: FieldsDiff<Record<string, unknown>>,
  ruleResolvedConflicts: RuleResolvedConflicts
): number {
  const fieldNames = Object.keys(ruleFieldsDiff);
  const fieldNamesWithConflict = fieldNames.filter(
    (fieldName) => ruleFieldsDiff[fieldName].conflict !== ThreeWayDiffConflict.NONE
  );
  const fieldNamesWithConflictSet = new Set(fieldNamesWithConflict);

  for (const resolvedConflictField of Object.keys(ruleResolvedConflicts)) {
    if (fieldNamesWithConflictSet.has(resolvedConflictField)) {
      fieldNamesWithConflictSet.delete(resolvedConflictField);
    }
  }

  return fieldNamesWithConflictSet.size;
}
