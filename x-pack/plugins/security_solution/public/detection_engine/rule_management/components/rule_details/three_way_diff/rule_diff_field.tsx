/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type {
  DiffableAllFields,
  DiffableRule,
  ThreeWayDiff,
} from '../../../../../../common/api/detection_engine';
import { ThreeWayDiffConflict } from '../../../../../../common/api/detection_engine';
import { ComparisonSide } from './comparison_side/comparison_side';
import { FinalSide } from './final_side/final_side';

interface RuleDiffFieldProps<FieldName extends keyof DiffableAllFields> {
  fieldName: FieldName;
  fieldThreeWayDiff: ThreeWayDiff<DiffableAllFields[FieldName]>;
  finalDiffableRule: DiffableRule;
  resolvedValue?: DiffableAllFields[FieldName];
}

export function RuleDiffField<FieldName extends keyof DiffableAllFields>({
  fieldName,
  fieldThreeWayDiff,
  finalDiffableRule,
  resolvedValue,
}: RuleDiffFieldProps<FieldName>): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'rule-diff-accordion' });
  const hasConflict = fieldThreeWayDiff.conflict !== ThreeWayDiffConflict.NONE;

  return (
    <>
      <EuiPanel>
        <EuiAccordion
          id={accordionId}
          buttonContent={fieldName}
          initialIsOpen={hasConflict}
          paddingSize="s"
        >
          <EuiFlexGroup gutterSize="s" alignItems="flexStart">
            <EuiFlexItem grow={1}>
              <ComparisonSide
                fieldName={fieldName}
                fieldThreeWayDiff={fieldThreeWayDiff}
                resolvedValue={resolvedValue}
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
              <FinalSide fieldName={fieldName} finalDiffableRule={finalDiffableRule} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}
