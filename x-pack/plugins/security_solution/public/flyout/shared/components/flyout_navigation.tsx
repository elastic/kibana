/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ExpandDetailButton } from './expand_detail_button';
import { HEADER_ACTIONS_TEST_ID } from './test_ids';

export interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
  /**
   * Expand left panel call back
   */
  expandDetails?: () => void;
  /**
   * Optional actions to be placed on the right hand side of navigation
   */
  actions?: React.ReactElement;
}

export const FlyoutNavigation: FC<PanelNavigationProps> = memo(
  ({ flyoutIsExpandable = false, expandDetails, actions }) => {
    const { euiTheme } = useEuiTheme();

    return flyoutIsExpandable || actions ? (
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="none"
          css={css`
            padding-left: ${euiTheme.size.s};
            padding-right: ${euiTheme.size.l};
          `}
        >
          <EuiFlexItem grow={false}>
            {flyoutIsExpandable && expandDetails && (
              <ExpandDetailButton expandDetails={expandDetails} />
            )}
          </EuiFlexItem>
          {actions && (
            <EuiFlexItem grow={false} data-test-subj={HEADER_ACTIONS_TEST_ID}>
              {actions}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
    ) : null;
  }
);

FlyoutNavigation.displayName = 'FlyoutNavigation';
