/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import { FieldUpgradeState } from '../../../../../model/prebuilt_rule_upgrade';
import { FieldUpgradeSideHeader } from '../../field_upgrade_side_header';
import { useFieldFinalSideContext } from '../context/field_final_side_context';
import { FieldFinalSideMode } from '../field_final_side_mode';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import { useFieldEditFormContext } from '../context/field_edit_form_context';
import { useFinalRuleContext } from '../../final_rule_context';
import { FieldFinalSideHelpInfo } from './field_final_side_help_info';
import * as i18n from './translations';

interface FieldFinalSideHeaderProps {
  fieldUpgradeState: FieldUpgradeState;
}

export function FieldFinalSideHeader({
  fieldUpgradeState,
}: FieldFinalSideHeaderProps): JSX.Element {
  const {
    state: { fieldName, mode },
  } = useFieldFinalSideContext();
  const { form } = useFieldEditFormContext();
  const { finalDiffableRule, setRuleFieldResolvedValue } = useFinalRuleContext();
  const handleAccept = useCallback(
    () =>
      setRuleFieldResolvedValue({
        ruleId: finalDiffableRule.rule_id,
        fieldName: fieldName as keyof DiffableAllFields,
        resolvedValue: finalDiffableRule[fieldName] as DiffableAllFields[typeof fieldName],
      }),
    [finalDiffableRule, fieldName, setRuleFieldResolvedValue]
  );
  const handleSave = useCallback(() => form?.submit(), [form]);

  switch (mode) {
    case FieldFinalSideMode.Readonly:
      return (
        <FieldUpgradeSideHeader>
          <StaticHeaderContent>
            {fieldUpgradeState !== FieldUpgradeState.Accepted && (
              <EuiButton iconType="checkInCircleFilled" size="s" onClick={handleAccept}>
                {i18n.ACCEPT}
              </EuiButton>
            )}
          </StaticHeaderContent>
        </FieldUpgradeSideHeader>
      );
    case FieldFinalSideMode.Edit:
      return (
        <FieldUpgradeSideHeader>
          <StaticHeaderContent>
            <EuiButton
              iconType="checkInCircleFilled"
              size="s"
              disabled={!form?.isValid}
              onClick={handleSave}
            >
              {fieldUpgradeState !== FieldUpgradeState.Accepted ? i18n.SAVE_AND_ACCEPT : i18n.SAVE}
            </EuiButton>
          </StaticHeaderContent>
        </FieldUpgradeSideHeader>
      );
    default:
      return assertUnreachable(mode);
  }
}

function StaticHeaderContent({ children }: PropsWithChildren<{}>): JSX.Element {
  return (
    <EuiFlexGroup alignItems="stretch" justifyContent="center">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiTitle size="xxs">
            <h3>
              {i18n.FINAL_UPDATE}
              <FieldFinalSideHelpInfo />
            </h3>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
