/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { DiffView } from '../json_diff/diff_view';
import { DiffMethod } from '../json_diff/mark_edits';
import { RuleDiffPanelWrapper } from './panel_wrapper';

export interface FieldDiffComponentProps {
  oldField: string | undefined;
  newField: string | undefined;
  fieldName: string;
}

export const FieldDiffComponent = ({ oldField, newField, fieldName }: FieldDiffComponentProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <RuleDiffPanelWrapper fieldName={fieldName}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <DiffView oldSource={oldField} newSource={newField} diffMethod={DiffMethod.WORDS} />
      </EuiFlexGroup>
    </RuleDiffPanelWrapper>
  );
};
