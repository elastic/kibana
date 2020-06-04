/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLink, EuiButton, EuiButtonProps, EuiLinkAnchorProps } from '@elastic/eui';

import { letBrowserHandleEvent } from './link_events';

/**
 * Generates either an EuiLink or EuiButton with a React-Router-ified link
 *
 * Based off of EUI's recommendations for handling React Router:
 * https://github.com/elastic/eui/blob/master/wiki/react-router.md#react-router-51
 */

interface IEuiReactRouterProps {
  to: string;
}

export const EuiReactRouterHelper: React.FC<IEuiReactRouterProps> = ({ to, children }) => {
  const history = useHistory();

  const onClick = (event: React.MouseEvent) => {
    if (letBrowserHandleEvent(event)) return;

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    // Push the route to the history.
    history.push(to);
  };

  // Generate the correct link href (with basename etc. accounted for)
  const href = history.createHref({ pathname: to });

  const reactRouterProps = { href, onClick };
  return React.cloneElement(children as React.ReactElement, reactRouterProps);
};

type TEuiReactRouterLinkProps = EuiLinkAnchorProps & IEuiReactRouterProps;
type TEuiReactRouterButtonProps = EuiButtonProps & IEuiReactRouterProps;

export const EuiReactRouterLink: React.FC<TEuiReactRouterLinkProps> = ({ to, ...rest }) => (
  <EuiReactRouterHelper to={to}>
    <EuiLink {...rest} />
  </EuiReactRouterHelper>
);

export const EuiReactRouterButton: React.FC<TEuiReactRouterButtonProps> = ({ to, ...rest }) => (
  <EuiReactRouterHelper to={to}>
    <EuiButton {...rest} />
  </EuiReactRouterHelper>
);
