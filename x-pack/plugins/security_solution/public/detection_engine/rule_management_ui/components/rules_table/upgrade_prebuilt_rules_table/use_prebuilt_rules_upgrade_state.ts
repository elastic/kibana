/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useIsPrebuiltRulesCustomizationEnabled } from '../../../../rule_management/hooks/use_is_prebuilt_rules_customization_enabled';
import type {
  RulesUpgradeState,
  FieldsUpgradeState,
  SetRuleFieldResolvedValueFn,
} from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { FieldUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import type {
  PartialRuleDiff,
  RuleFieldsDiff,
} from '../../../../../../common/api/detection_engine';
import {
  type FieldsDiff,
  type DiffableAllFields,
  type DiffableRule,
  type RuleUpgradeInfoForReview,
  ThreeWayDiffConflict,
  type RuleSignatureId,
  NON_UPGRADEABLE_DIFFABLE_FIELDS,
} from '../../../../../../common/api/detection_engine';
import { convertRuleToDiffable } from '../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import { assertUnreachable } from '../../../../../../common/utility_types';

type RuleResolvedConflicts = Partial<DiffableAllFields>;
type RulesResolvedConflicts = Record<RuleSignatureId, RuleResolvedConflicts>;

interface UseRulesUpgradeStateResult {
  rulesUpgradeState: RulesUpgradeState;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

export function usePrebuiltRulesUpgradeState(
  ruleUpgradeInfos: RuleUpgradeInfoForReview[]
): UseRulesUpgradeStateResult {
  const isPrebuiltRulesCustomizationEnabled = useIsPrebuiltRulesCustomizationEnabled();
  const [rulesResolvedConflicts, setRulesResolvedConflicts] = useState<RulesResolvedConflicts>({});

  const setRuleFieldResolvedValue = useCallback(
    (...[params]: Parameters<SetRuleFieldResolvedValueFn>) => {
      setRulesResolvedConflicts((prevRulesResolvedConflicts) => ({
        ...prevRulesResolvedConflicts,
        [params.ruleId]: {
          ...(prevRulesResolvedConflicts[params.ruleId] ?? {}),
          [params.fieldName]: params.resolvedValue,
        },
      }));
    },
    []
  );

  const rulesUpgradeState = useMemo(() => {
    const state: RulesUpgradeState = {};

    for (const ruleUpgradeInfo of ruleUpgradeInfos) {
      const customizableFieldsDiff = calcCustomizableFieldsDiff(ruleUpgradeInfo.diff);
      const fieldsUpgradeState = calcFieldsState(
        customizableFieldsDiff,
        rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
      );

      state[ruleUpgradeInfo.rule_id] = {
        ...ruleUpgradeInfo,
        customizableFieldsDiff,
        finalRule: calcFinalDiffableRule(
          ruleUpgradeInfo,
          rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
        ),
        fieldsUpgradeState,
        hasUnresolvedConflicts: isPrebuiltRulesCustomizationEnabled
          ? Object.values(fieldsUpgradeState).some(
              (x) => x !== FieldUpgradeState.NoConflict && x !== FieldUpgradeState.Accepted
            )
          : false,
      };
    }

    return state;
  }, [ruleUpgradeInfos, rulesResolvedConflicts, isPrebuiltRulesCustomizationEnabled]);

  return {
    rulesUpgradeState,
    setRuleFieldResolvedValue,
  };
}

function calcCustomizableFieldsDiff(ruleFieldsDiff: PartialRuleDiff): PartialRuleDiff {
  const fieldsDiff: Partial<RuleFieldsDiff> = {};
  let numFieldsWithUpdates = 0;
  let numFieldsWithConflicts = 0;
  let numFieldsWithNonSolvableConflicts = 0;

  for (const [fieldName, diff] of Object.entries(ruleFieldsDiff.fields)) {
    if (NON_UPGRADEABLE_DIFFABLE_FIELDS.includes(fieldName)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    fieldsDiff[fieldName as keyof RuleFieldsDiff] = diff;

    if (diff.has_update) {
      numFieldsWithUpdates++;
    }

    if (diff.conflict !== ThreeWayDiffConflict.NONE) {
      numFieldsWithConflicts++;
    }

    if (diff.conflict === ThreeWayDiffConflict.NON_SOLVABLE) {
      numFieldsWithNonSolvableConflicts++;
    }
  }

  return {
    num_fields_with_updates: numFieldsWithUpdates,
    num_fields_with_conflicts: numFieldsWithConflicts,
    num_fields_with_non_solvable_conflicts: numFieldsWithNonSolvableConflicts,
    fields: fieldsDiff,
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
 * Assembles a `DiffableRule` from rule fields diff `merged_version`s.
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

function calcFieldsState(
  ruleDiff: PartialRuleDiff,
  ruleResolvedConflicts: RuleResolvedConflicts
): FieldsUpgradeState {
  const fieldsState: FieldsUpgradeState = {};

  for (const fieldName of Object.keys(ruleDiff.fields)) {
    const conflict =
      ruleDiff.fields[fieldName as keyof typeof ruleDiff.fields]?.conflict ??
      ThreeWayDiffConflict.NONE;

    switch (conflict) {
      case ThreeWayDiffConflict.NONE:
        fieldsState[fieldName] = FieldUpgradeState.NoConflict;
        break;

      case ThreeWayDiffConflict.SOLVABLE:
        fieldsState[fieldName] = FieldUpgradeState.SolvableConflict;
        break;

      case ThreeWayDiffConflict.NON_SOLVABLE:
        fieldsState[fieldName] = FieldUpgradeState.NonSolvableConflict;
        break;

      default:
        assertUnreachable(conflict);
    }
  }

  for (const fieldName of Object.keys(ruleResolvedConflicts)) {
    fieldsState[fieldName] = FieldUpgradeState.Accepted;
  }

  return fieldsState;
}
