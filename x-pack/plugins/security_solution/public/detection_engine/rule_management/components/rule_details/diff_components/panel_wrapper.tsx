/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiSplitPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import { camelCase, startCase } from 'lodash';
import { css } from '@emotion/css';
import React from 'react';
import { fieldToDisplayNameMap } from './translations';

interface RuleDiffPanelWrapperProps {
  fieldName: string;
  children: React.ReactNode;
}

export const RuleDiffPanelWrapper = ({ fieldName, children }: RuleDiffPanelWrapperProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer data-test-subj="ruleUpgradePerFieldDiffWrapper" hasBorder>
      <EuiAccordion
        initialIsOpen={true}
        css={css`
          .euiAccordion__triggerWrapper {
            background: ${euiTheme.colors.lightestShade};
            padding: ${euiTheme.size.m};
          }
        `}
        id={fieldName}
        buttonContent={
          <EuiTitle data-test-subj="ruleUpgradePerFieldDiffLabel" size="xs">
            <h5>{fieldToDisplayNameMap[fieldName] ?? startCase(camelCase(fieldName))}</h5>
          </EuiTitle>
        }
      >
        <EuiSplitPanel.Inner data-test-subj="ruleUpgradePerFieldDiffContent" color="transparent">
          {children}
        </EuiSplitPanel.Inner>
      </EuiAccordion>
    </EuiSplitPanel.Outer>
  );
};
