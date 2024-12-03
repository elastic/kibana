/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type {
  DiffableRule,
  FieldsDiff,
  ThreeWayDiff,
} from '../../../../../../../common/api/detection_engine';
import { invariant } from '../../../../../../../common/utils/invariant';
import { convertRuleToDiffable } from '../../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import type { SetRuleFieldResolvedValueFn } from '../../../../model/prebuilt_rule_upgrade/set_rule_field_resolved_value';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import type { RuleUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import { FieldUpgradeState } from '../../../../model/prebuilt_rule_upgrade';

export enum FieldFinalSideMode {
  Readonly = 'readonly',
  Edit = 'edit',
}

interface FieldUpgradeContextType {
  /**
   * Field name of an upgradable field from DiffableRule
   */
  fieldName: UpgradeableDiffableFields;
  /**
   * Field's upgrade state
   */
  fieldUpgradeState: FieldUpgradeState;
  /**
   * Field's three way diff
   */
  fieldDiff: ThreeWayDiff<unknown>;
  /**
   * Current final diffable rule including resolved values
   */
  finalDiffableRule: DiffableRule;
  /**
   * Field final side view mode `Readonly` or `Editing`
   */
  rightSideMode: FieldFinalSideMode;
  /**
   * Sets field's resolved value
   */
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
  /**
   * Sets field's right side `readonly` mode
   */
  setReadOnlyMode: () => void;
  /**
   * Sets field's right side `edit` mode
   */
  setEditMode: () => void;
}

const FieldUpgradeContext = createContext<FieldUpgradeContextType | null>(null);

interface FieldUpgradeContextProviderProps {
  ruleUpgradeState: RuleUpgradeState;
  fieldName: UpgradeableDiffableFields;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
  children: React.ReactNode;
}

export function FieldUpgradeContextProvider({
  ruleUpgradeState,
  fieldName,
  setRuleFieldResolvedValue,
  children,
}: FieldUpgradeContextProviderProps) {
  const { state: fieldUpgradeState } = ruleUpgradeState.fieldsUpgradeState[fieldName];
  const fieldDiff = ruleUpgradeState.diff.fields[fieldName];
  const initialRightSideMode =
    fieldUpgradeState === FieldUpgradeState.NonSolvableConflict
      ? FieldFinalSideMode.Edit
      : FieldFinalSideMode.Readonly;

  const [editing, { on: setEditMode, off: setReadOnlyMode }] = useBoolean(
    initialRightSideMode === FieldFinalSideMode.Edit
  );

  if (!fieldDiff) {
    throw new Error(`Field diff is not found for ${fieldName}.`);
  }

  const contextValue: FieldUpgradeContextType = useMemo(
    () => ({
      fieldName,
      fieldUpgradeState,
      fieldDiff,
      finalDiffableRule: calcFinalDiffableRule(ruleUpgradeState),
      rightSideMode: editing ? FieldFinalSideMode.Edit : FieldFinalSideMode.Readonly,
      setRuleFieldResolvedValue,
      setReadOnlyMode,
      setEditMode,
    }),
    [
      fieldName,
      fieldUpgradeState,
      fieldDiff,
      ruleUpgradeState,
      editing,
      setRuleFieldResolvedValue,
      setReadOnlyMode,
      setEditMode,
    ]
  );

  return (
    <FieldUpgradeContext.Provider value={contextValue}>{children}</FieldUpgradeContext.Provider>
  );
}

export function useFieldUpgradeContext() {
  const context = useContext(FieldUpgradeContext);

  invariant(
    context !== null,
    'useFieldUpgradeContext must be used inside a FieldUpgradeContextProvider'
  );

  return context;
}

function calcFinalDiffableRule(ruleUpgradeState: RuleUpgradeState): DiffableRule {
  const fieldsResolvedValues = Object.entries(ruleUpgradeState.fieldsUpgradeState).reduce<
    Record<string, unknown>
  >((result, [fieldName, fieldState]) => {
    if (fieldState.state === FieldUpgradeState.Accepted && Boolean(fieldState.resolvedValue)) {
      result[fieldName] = fieldState.resolvedValue;
    }

    return result;
  }, {});

  return {
    ...convertRuleToDiffable(ruleUpgradeState.target_rule),
    ...convertRuleFieldsDiffToDiffable(ruleUpgradeState.diff.fields),
    ...fieldsResolvedValues,
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
