/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiHorizontalRule, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { DiffView } from '../json_diff/diff_view';
import { DiffMethod } from '../json_diff/mark_edits';
import { RuleDiffPanelWrapper } from './panel_wrapper';

export interface FieldDiffComponentProps {
  ruleDiffs: Array<{ currentVersion: string; targetVersion: string; fieldName: string }>;
  fieldName: string;
}

export const FieldDiffComponent = ({ ruleDiffs, fieldName }: FieldDiffComponentProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <RuleDiffPanelWrapper fieldName={fieldName}>
      {ruleDiffs.length === 1 ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <DiffView
            oldSource={ruleDiffs[0].currentVersion}
            newSource={ruleDiffs[0].targetVersion}
            diffMethod={DiffMethod.WORDS}
          />
        </EuiFlexGroup>
      ) : (
        ruleDiffs.map(({ currentVersion, targetVersion, fieldName: specificFieldName }) => (
          <EuiFlexGroup key={specificFieldName} justifyContent="spaceBetween">
            {currentVersion !== targetVersion ? (
              <EuiFlexGroup direction="column">
                <EuiTitle size="xxxs">
                  <h4>{specificFieldName}</h4>
                </EuiTitle>
                <DiffView
                  oldSource={currentVersion}
                  newSource={targetVersion}
                  diffMethod={DiffMethod.WORDS}
                />
                <EuiHorizontalRule margin="s" size="full" />
              </EuiFlexGroup>
            ) : null}
          </EuiFlexGroup>
        ))
      )}
    </RuleDiffPanelWrapper>
  );
};
