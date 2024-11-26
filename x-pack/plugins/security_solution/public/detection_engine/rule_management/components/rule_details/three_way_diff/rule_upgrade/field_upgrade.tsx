/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { isEqual } from 'lodash';
import { SplitAccordion } from '../../../../../../common/components/split_accordion';
import type {
  DiffableAllFields,
  RuleFieldsDiff,
  ThreeWayDiff,
} from '../../../../../../../common/api/detection_engine';
import { ThreeWayDiffConflict } from '../../../../../../../common/api/detection_engine';
import type { FieldUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import { FieldComparisonSide } from '../comparison_side/field_comparison_side';
import { FieldFinalSide } from '../field_final_side';
import { FieldUpgradeHeader } from './field_upgrade_header';
import { useFinalRuleContext } from '../final_rule_context';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';

interface FieldUpgradeProps<FieldName extends UpgradeableDiffableFields> {
  fieldName: FieldName;
  fieldUpgradeState: FieldUpgradeState;
  fieldThreeWayDiff: RuleFieldsDiff[FieldName];
}

export function FieldUpgrade<FieldName extends UpgradeableDiffableFields>({
  fieldName,
  fieldUpgradeState,
  fieldThreeWayDiff,
}: FieldUpgradeProps<FieldName>): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const hasConflict = fieldThreeWayDiff.conflict !== ThreeWayDiffConflict.NONE;
  const { finalDiffableRule } = useFinalRuleContext();
  const isFieldCustomized = useMemo(
    () =>
      fieldThreeWayDiff.has_base_version
        ? !isEqual(fieldThreeWayDiff.base_version, fieldThreeWayDiff.current_version)
        : false,
    [fieldThreeWayDiff]
  );

  return (
    <>
      <SplitAccordion
        header={
          <FieldUpgradeHeader
            fieldName={fieldName}
            fieldUpgradeState={fieldUpgradeState}
            isCustomized={isFieldCustomized}
          />
        }
        initialIsOpen={hasConflict}
        data-test-subj="ruleUpgradePerFieldDiff"
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart">
          <EuiFlexItem grow={1}>
            <FieldComparisonSide
              fieldName={fieldName}
              fieldThreeWayDiff={fieldThreeWayDiff as ThreeWayDiff<DiffableAllFields[FieldName]>}
              resolvedValue={finalDiffableRule[fieldName] as DiffableAllFields[FieldName]}
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={0}
            css={css`
              align-self: stretch;
              border-right: ${euiTheme.border.thin};
            `}
          />
          <EuiFlexItem grow={1}>
            <FieldFinalSide fieldName={fieldName} fieldUpgradeState={fieldUpgradeState} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SplitAccordion>
      <EuiSpacer size="s" />
    </>
  );
}
