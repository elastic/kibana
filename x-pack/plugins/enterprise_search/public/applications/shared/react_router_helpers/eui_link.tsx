/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLink, EuiButton } from '@elastic/eui';

import { letBrowserHandleEvent } from './link_events';

/**
 * Generates either an EuiLink or EuiButton with a React-Router-ified link
 *
 * Based off of EUI's recommendations for handling React Router:
 * https://github.com/elastic/eui/blob/master/wiki/react-router.md#react-router-51
 */

interface IEuiReactRouterProps {
  to: string;
  isButton?: boolean;
}

export const EuiReactRouterLink: React.FC<IEuiReactRouterProps> = ({ to, isButton, ...rest }) => {
  const history = useHistory();

  const onClick = (event) => {
    if (letBrowserHandleEvent(event)) return;

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    // Push the route to the history.
    history.push(to);
  };

  // Generate the correct link href (with basename etc. accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href, onClick };
  return isButton ? <EuiButton {...props} /> : <EuiLink {...props} />;
};

export const EuiReactRouterButton: React.FC<IEuiReactRouterProps> = (props) => (
  <EuiReactRouterLink {...props} isButton />
);
