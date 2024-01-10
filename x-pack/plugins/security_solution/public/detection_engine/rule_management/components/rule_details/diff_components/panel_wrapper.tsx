/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiHorizontalRule, EuiIconTip, EuiSplitPanel, EuiTitle } from '@elastic/eui';
import { camelCase, startCase } from 'lodash';
import React from 'react';
import * as i18n from '../json_diff/translations';

interface RuleDiffPanelWrapperProps {
  fieldName: string;
  children: React.ReactNode;
}

export const RuleDiffPanelWrapper = ({ fieldName, children }: RuleDiffPanelWrapperProps) => {
  return (
    <EuiSplitPanel.Outer hasBorder>
      <EuiSplitPanel.Inner color="subdued">
        <EuiTitle size="xxs">
          {/* TODO: replace with i18n translations */}
          <h5>{startCase(camelCase(fieldName))}</h5> 
        </EuiTitle>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="transparent">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiIconTip
              color="subdued"
              content={i18n.BASE_VERSION_DESCRIPTION}
              type="iInCircle"
              size="m"
              display="block"
            />
            <EuiTitle size="xxxs">
              <h6>{i18n.BASE_VERSION}</h6>
            </EuiTitle>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiIconTip
              color="subdued"
              content={i18n.UPDATED_VERSION_DESCRIPTION}
              type="iInCircle"
              size="m"
            />
            <EuiTitle size="xxxs">
              <h6>{i18n.UPDATED_VERSION}</h6>
            </EuiTitle>
          </EuiFlexGroup>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" size="full" />
        {children}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
