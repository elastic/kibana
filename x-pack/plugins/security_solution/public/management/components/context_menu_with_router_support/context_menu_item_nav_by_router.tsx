/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiContextMenuItem, EuiContextMenuItemProps } from '@elastic/eui';
import { NavigateToAppOptions } from 'kibana/public';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

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
  children: React.ReactNode;
}

/**
 * Just like `EuiContextMenuItem`, but allows for additional props to be defined which will
 * allow navigation to a URL path via React Router
 */
export const ContextMenuItemNavByRouter = memo<ContextMenuItemNavByRouterProps>(
  ({ navigateAppId, navigateOptions, onClick, textTruncate, children, ...otherMenuItemProps }) => {
    const handleOnClickViaNavigateToApp = useNavigateToAppEventHandler(navigateAppId ?? '', {
      ...navigateOptions,
      onClick,
    });

    return (
      <EuiContextMenuItem
        {...otherMenuItemProps}
        onClick={navigateAppId ? handleOnClickViaNavigateToApp : onClick}
      >
        {textTruncate ? (
          <div
            className="eui-textTruncate"
            {
              /* Add the html `title` prop if children is a string */
              ...('string' === typeof children ? { title: children } : {})
            }
          >
            {children}
          </div>
        ) : (
          children
        )}
      </EuiContextMenuItem>
    );
  }
);

ContextMenuItemNavByRouter.displayName = 'EuiContextMenuItemNavByRouter';
