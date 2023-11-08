/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  HEADER_ACTIONS_TEST_ID,
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
} from './test_ids';

export interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
  /**
   * If flyoutIsExpandable is true, pass a callback to open left panel
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
    const { closeLeftPanel, panels } = useExpandableFlyoutContext();

    const isExpanded: boolean = panels.left != null;
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
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.header.collapseDetailButtonLabel"
            defaultMessage="Collapse details"
          />
        </EuiButtonEmpty>
      ),
      [collapseDetails]
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
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.header.expandDetailButtonLabel"
            defaultMessage="Expand details"
          />
        </EuiButtonEmpty>
      ),
      [expandDetails]
    );

    return flyoutIsExpandable || actions ? (
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="none"
          responsive={false}
          css={css`
            padding-left: ${euiTheme.size.s};
            padding-right: ${euiTheme.size.l};
            height: ${euiTheme.size.xxl};
          `}
        >
          <EuiFlexItem grow={false}>
            {flyoutIsExpandable && expandDetails && (isExpanded ? collapseButton : expandButton)}
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
