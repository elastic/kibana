/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuItemProps,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { NavigateToAppOptions } from 'kibana/public';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

export interface ContextMenuItemNavByRouterProps extends EuiContextMenuItemProps {
  /** The Kibana (plugin) app id */
  navigateAppId?: string;
  /** Additional options for the navigation action via react-router */
  navigateOptions?: NavigateToAppOptions;
  /**
   * if `true`, the `children` will be wrapped in a `div` that contains CSS Classname `eui-textTruncate`.
   * **NOTE**: When this component is used in combination with `ContextMenuWithRouterSupport` and `maxWidth`
   * is set on the menu component, this prop will be overridden
   */
  textTruncate?: boolean;
  /** Displays a link button when hover an item, false by default */
  displayLinkButtonOnHover?: boolean;
  children: React.ReactNode;
}

const StyledEuiContextMenuItem = styled(EuiContextMenuItem)`
  .link-button {
    display: none;
  }
  &:hover {
    .link-button {
      display: block !important;
    }
  }
`;
const StyledEuiButtonEmpty = styled(EuiButtonEmpty)`
  height: 10px !important;
`;

/**
 * Just like `EuiContextMenuItem`, but allows for additional props to be defined which will
 * allow navigation to a URL path via React Router
 */
export const ContextMenuItemNavByRouter = memo<ContextMenuItemNavByRouterProps>(
  ({
    navigateAppId,
    navigateOptions,
    onClick,
    textTruncate,
    displayLinkButtonOnHover = false,
    children,
    ...otherMenuItemProps
  }) => {
    const handleOnClickViaNavigateToApp = useNavigateToAppEventHandler(navigateAppId ?? '', {
      ...navigateOptions,
      onClick,
    });
    const getTestId = useTestIdGenerator(otherMenuItemProps['data-test-subj']);

    return (
      <StyledEuiContextMenuItem
        {...otherMenuItemProps}
        onClick={navigateAppId ? handleOnClickViaNavigateToApp : onClick}
      >
        {textTruncate ? (
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <div
              className="eui-textTruncate"
              data-test-subj={getTestId('truncateWrapper')}
              {
                /* Add the html `title` prop if children is a string */
                ...('string' === typeof children ? { title: children } : {})
              }
            >
              {children}
            </div>
            {displayLinkButtonOnHover && (
              <EuiFlexItem className="link-button" grow={false}>
                <StyledEuiButtonEmpty flush="right" size="s" iconSide="right" iconType="popout">
                  <FormattedMessage
                    id="pack.securitySolution.contextMenuItemByRouter.viewDetails"
                    defaultMessage="View details"
                  />
                </StyledEuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          children
        )}
      </StyledEuiContextMenuItem>
    );
  }
);

ContextMenuItemNavByRouter.displayName = 'EuiContextMenuItemNavByRouter';
