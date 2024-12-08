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
import { FieldComparisonSide } from '../comparison_side/field_comparison_side';
import { FieldFinalSide } from '../field_final_side';
import { FieldUpgradeHeader } from './field_upgrade_header';
import { useFieldUpgradeContext } from './field_upgrade_context';

export function FieldUpgrade(): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const { fieldName, fieldUpgradeState, hasConflict, fieldDiff } = useFieldUpgradeContext();
  const isFieldCustomized = useMemo(
    () =>
      fieldDiff.has_base_version
        ? !isEqual(fieldDiff.base_version, fieldDiff.current_version)
        : false,
    [fieldDiff]
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
            <FieldComparisonSide />
          </EuiFlexItem>
          <EuiFlexItem
            grow={0}
            css={css`
              align-self: stretch;
              border-right: ${euiTheme.border.thin};
            `}
          />
          <EuiFlexItem grow={1}>
            <FieldFinalSide />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SplitAccordion>
      <EuiSpacer size="s" />
    </>
  );
}
