/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, MouseEventHandler } from 'react';
import { EuiLink } from '@elastic/eui';
import { EuiLinkProps } from '@elastic/eui';
import { useNavigateToAppEventHandler } from '../hooks/use_navigate_to_app_event_handler';

type LinkToAppProps = EuiLinkProps & {
  /** the app id - normally the value of the `id` in that plugin's `kibana.json`  */
  appId: string;
  /** Any app specific path (route) */
  appPath?: string;
  appState?: any;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
};

/**
 * An `EuiLink` that will use Kibana's `.application.navigateToApp()` to redirect the user to the
 * a given app without causing a full browser refresh
 */
export const LinkToApp = memo<LinkToAppProps>(
  ({ appId, appPath: path, appState: state, onClick, children, ...otherProps }) => {
    const handleOnClick = useNavigateToAppEventHandler(appId, { path, state, onClick });
    return (
      // eslint-disable-next-line @elastic/eui/href-or-on-click
      <EuiLink {...otherProps} onClick={handleOnClick}>
        {children}
      </EuiLink>
    );
  }
);
