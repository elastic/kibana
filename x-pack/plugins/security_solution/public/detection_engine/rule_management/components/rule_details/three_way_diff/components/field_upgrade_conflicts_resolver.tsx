/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { SplitAccordion } from '../../../../../../common/components/split_accordion';
import type {
  DiffableAllFields,
  RuleFieldsDiff,
  ThreeWayDiff,
} from '../../../../../../../common/api/detection_engine';
import { ThreeWayDiffConflict } from '../../../../../../../common/api/detection_engine';
import type { FieldUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import { ComparisonSide } from '../comparison_side/comparison_side';
import { FinalSide } from '../final_side/final_side';
import { FieldUpgradeConflictsResolverHeader } from './field_upgrade_conflicts_resolver_header';
import { useDiffableRuleContext } from '../diffable_rule_context';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';

interface FieldUpgradeConflictsResolverProps<FieldName extends UpgradeableDiffableFields> {
  fieldName: FieldName;
  fieldUpgradeState: FieldUpgradeState;
  fieldThreeWayDiff: RuleFieldsDiff[FieldName];
}

export function FieldUpgradeConflictsResolver<FieldName extends UpgradeableDiffableFields>({
  fieldName,
  fieldUpgradeState,
  fieldThreeWayDiff,
}: FieldUpgradeConflictsResolverProps<FieldName>): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const hasConflict = fieldThreeWayDiff.conflict !== ThreeWayDiffConflict.NONE;

  const { finalDiffableRule } = useDiffableRuleContext();

  return (
    <>
      <SplitAccordion
        header={
          <FieldUpgradeConflictsResolverHeader
            fieldName={fieldName}
            fieldUpgradeState={fieldUpgradeState}
          />
        }
        initialIsOpen={hasConflict}
        data-test-subj="ruleUpgradePerFieldDiff"
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart">
          <EuiFlexItem grow={1}>
            <ComparisonSide
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
            <FinalSide fieldName={fieldName} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SplitAccordion>
      <EuiSpacer size="s" />
    </>
  );
}
