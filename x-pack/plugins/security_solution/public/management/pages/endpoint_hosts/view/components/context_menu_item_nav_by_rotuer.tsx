/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiContextMenuItem, EuiContextMenuItemProps } from '@elastic/eui';
import { NavigateToAppOptions } from 'kibana/public';
import { useNavigateToAppEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

export interface ContextMenuItemNavByRouterProps extends EuiContextMenuItemProps {
  navigateAppId: string;
  navigateOptions: NavigateToAppOptions;
  children: React.ReactNode;
}

/**
 * Just like `EuiContextMenuItem`, but allows for additional props to be defined which will
 * allow navigation to a URL path via React Router
 */
export const ContextMenuItemNavByRouter = memo<ContextMenuItemNavByRouterProps>(
  ({ navigateAppId, navigateOptions, onClick, children, ...otherMenuItemProps }) => {
    const handleOnClick = useNavigateToAppEventHandler(navigateAppId, {
      ...navigateOptions,
      onClick,
    });

    return (
      <EuiContextMenuItem {...otherMenuItemProps} onClick={handleOnClick}>
        {children}
      </EuiContextMenuItem>
    );
  }
);
