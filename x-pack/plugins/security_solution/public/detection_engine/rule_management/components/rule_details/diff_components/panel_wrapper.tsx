/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiIconTip,
  EuiSplitPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { camelCase, startCase } from 'lodash';
import { css } from '@emotion/css';
import React from 'react';
import * as i18n from '../json_diff/translations';

interface RuleDiffPanelWrapperProps {
  fieldName: string;
  children: React.ReactNode;
}

export const RuleDiffPanelWrapper = ({ fieldName, children }: RuleDiffPanelWrapperProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer hasBorder>
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
          <EuiTitle size="xs">
            {/* TODO: replace with i18n translations */}
            <h5>{startCase(camelCase(fieldName))}</h5>
          </EuiTitle>
        }
      >
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
              <EuiTitle size="xxs">
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
              <EuiTitle size="xxs">
                <h6>{i18n.UPDATED_VERSION}</h6>
              </EuiTitle>
            </EuiFlexGroup>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="s" size="full" />
          {children}
        </EuiSplitPanel.Inner>
      </EuiAccordion>
    </EuiSplitPanel.Outer>
  );
};
