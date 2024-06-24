/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, SyntheticEvent } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutState,
  useExpandableFlyoutHistory,
} from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FlyoutHistory } from './flyout_history';
import {
  HEADER_ACTIONS_TEST_ID,
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  HEADER_NAVIGATION_BUTTON_TEST_ID,
} from './test_ids';

export interface FlyoutNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
  /**
   * If flyoutIsExpandable is true, pass a callback to open left panel
   */
  expandDetails?: (e: SyntheticEvent) => void;
  /**
   * Optional actions to be placed on the right hand side of navigation
   */
  actions?: React.ReactElement;
}

/**
 * Navigation menu on the right panel only, with expand/collapse button and option to
 * pass in a list of actions to be displayed on top.
 */
export const FlyoutNavigation: FC<FlyoutNavigationProps> = memo(
  ({ flyoutIsExpandable = false, expandDetails, actions }) => {
    const { euiTheme } = useEuiTheme();
    const { closeLeftPanel } = useExpandableFlyoutApi();
    const panels = useExpandableFlyoutState();

    const history = useExpandableFlyoutHistory();
    const hasHistory = history.length > 1;

    const isExpanded: boolean = !!panels.left;
    const collapseDetails = useCallback(() => closeLeftPanel(), [closeLeftPanel]);

    const collapseButton = useMemo(
      () => (
        <EuiButtonEmpty
          iconSide="left"
          onClick={collapseDetails}
          iconType="arrowEnd"
          size="s"
          data-test-subj={COLLAPSE_DETAILS_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.header.collapseDetailButtonAriaLabel',
            {
              defaultMessage: 'Collapse details',
            }
          )}
        >
          {!hasHistory && (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.header.collapseDetailButtonLabel"
              defaultMessage="Collapse details"
            />
          )}
        </EuiButtonEmpty>
      ),
      [collapseDetails, hasHistory]
    );

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
          {!hasHistory && (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.header.expandDetailButtonLabel"
              defaultMessage="Expand details"
            />
          )}
        </EuiButtonEmpty>
      ),
      [expandDetails, hasHistory]
    );

    return flyoutIsExpandable || hasHistory || actions ? (
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="none"
          responsive={false}
          css={css`
            padding-left: ${euiTheme.size.s};
            padding-right: ${euiTheme.size.xl};
            height: ${euiTheme.size.xxl};
          `}
        >
          <EuiFlexItem grow={false}>
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
                  {isExpanded ? collapseButton : expandButton}
                </EuiFlexItem>
              )}
              {hasHistory && <FlyoutHistory history={history} />}
            </EuiFlexGroup>
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
