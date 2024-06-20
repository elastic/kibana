/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, SyntheticEvent } from 'react';
import React, { memo, useMemo } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EXPAND_DETAILS_BUTTON_TEST_ID, HEADER_NAVIGATION_BUTTON_TEST_ID } from './test_ids';

export interface PreviewNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
  /**
   * If flyoutIsExpandable is true, pass a callback to open left panel
   */
  expandDetails?: (e: SyntheticEvent) => void;
}

/**
 * Navigation menu on the right panel only, with expand/collapse button and option to
 * pass in a list of actions to be displayed on top.
 */
export const PreviewNavigation: FC<PreviewNavigationProps> = memo(
  ({ flyoutIsExpandable = false, expandDetails }) => {
    const { euiTheme } = useEuiTheme();

    const expandButton = useMemo(
      () => (
        <EuiButtonEmpty
          iconSide="left"
          onClick={expandDetails}
          iconType="arrowStart"
          size="s"
          data-test-subj={EXPAND_DETAILS_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.header.expandDetailButtonAriaLabel',
            {
              defaultMessage: 'Expand details',
            }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.header.expandDetailButtonLabel"
            defaultMessage="Expand details"
          />
        </EuiButtonEmpty>
      ),
      [expandDetails]
    );

    return flyoutIsExpandable ? (
      <EuiFlyoutHeader
        hasBorder
        css={css`
          /* margin-top: -35px; */
          padding-left: ${euiTheme.size.s};
          padding-right: 0;
          margin-right: 30px;
          height: ${euiTheme.size.xxl};
        `}
      >
        <EuiFlexGroup
          direction="row"
          gutterSize="none"
          justifyContent="flexStart"
          alignItems="center"
          responsive={false}
        >
          {flyoutIsExpandable && expandDetails && (
            <EuiFlexItem
              grow={false}
              data-test-subj={HEADER_NAVIGATION_BUTTON_TEST_ID}
              css={css`
                border-right: 1px ${euiTheme.colors.lightShade} solid;
                padding-right: -${euiTheme.size.m};
              `}
            >
              {expandButton}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
    ) : null;
  }
);

PreviewNavigation.displayName = 'PreviewNavigation';
