/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import { camelCase, startCase } from 'lodash';
import React from 'react';
import { DiffView } from '../json_diff/diff_view';
import { RuleDiffPanelWrapper } from './panel_wrapper';
import type { FormattedFieldDiff, FieldDiff } from '../../../model/rule_details/rule_field_diff';
import { fieldToDisplayNameMap } from './translations';

const SubFieldComponent = ({
  currentVersion,
  targetVersion,
  fieldName,
  shouldShowSeparator,
  shouldShowSubtitles,
}: FieldDiff & {
  shouldShowSeparator: boolean;
  shouldShowSubtitles: boolean;
}) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexGroup direction="column">
      {shouldShowSubtitles ? (
        <EuiTitle data-test-subj="ruleUpgradePerFieldDiffSubtitle" size="xxxs">
          <h4>{fieldToDisplayNameMap[fieldName] ?? startCase(camelCase(fieldName))}</h4>
        </EuiTitle>
      ) : null}
      <DiffView oldSource={currentVersion} newSource={targetVersion} />
      {shouldShowSeparator ? <EuiHorizontalRule margin="s" size="full" /> : null}
    </EuiFlexGroup>
  </EuiFlexGroup>
);

export interface FieldDiffComponentProps {
  ruleDiffs: FormattedFieldDiff;
  fieldsGroupName: string;
}

export const FieldGroupDiffComponent = ({
  ruleDiffs,
  fieldsGroupName,
}: FieldDiffComponentProps) => {
  const { fieldDiffs, shouldShowSubtitles } = ruleDiffs;
  return (
    <RuleDiffPanelWrapper fieldName={fieldsGroupName}>
      {fieldDiffs.map(({ currentVersion, targetVersion, fieldName: specificFieldName }, index) => {
        const shouldShowSeparator = index !== fieldDiffs.length - 1;
        return (
          <SubFieldComponent
            key={specificFieldName}
            shouldShowSeparator={shouldShowSeparator}
            shouldShowSubtitles={shouldShowSubtitles}
            currentVersion={currentVersion}
            targetVersion={targetVersion}
            fieldName={specificFieldName}
          />
        );
      })}
    </RuleDiffPanelWrapper>
  );
};
