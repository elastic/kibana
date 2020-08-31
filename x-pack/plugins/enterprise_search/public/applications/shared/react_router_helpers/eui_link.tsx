/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLink, EuiButton, EuiButtonProps, EuiLinkAnchorProps } from '@elastic/eui';

import { KibanaContext, IKibanaContext } from '../../index';
import { letBrowserHandleEvent } from './link_events';

/**
 * Generates either an EuiLink or EuiButton with a React-Router-ified link
 *
 * Based off of EUI's recommendations for handling React Router:
 * https://github.com/elastic/eui/blob/master/wiki/react-router.md#react-router-51
 */

interface IEuiReactRouterProps {
  to: string;
  onClick?(): void;
}

export const EuiReactRouterHelper: React.FC<IEuiReactRouterProps> = ({ to, onClick, children }) => {
  const history = useHistory();
  const { navigateToUrl } = useContext(KibanaContext) as IKibanaContext;

  // Generate the correct link href (with basename etc. accounted for)
  const href = history.createHref({ pathname: to });

  const reactRouterLinkClick = (event: React.MouseEvent) => {
    if (onClick) onClick(); // Run any passed click events (e.g. telemetry)
    if (letBrowserHandleEvent(event)) return; // Return early if the link behavior shouldn't be handled by React Router

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    // Perform SPA navigation.
    navigateToUrl(href);
  };

  const reactRouterProps = { href, onClick: reactRouterLinkClick };
  return React.cloneElement(children as React.ReactElement, reactRouterProps);
};

type TEuiReactRouterLinkProps = EuiLinkAnchorProps & IEuiReactRouterProps;
type TEuiReactRouterButtonProps = EuiButtonProps & IEuiReactRouterProps;

export const EuiReactRouterLink: React.FC<TEuiReactRouterLinkProps> = ({
  to,
  onClick,
  ...rest
}) => (
  <EuiReactRouterHelper to={to} onClick={onClick}>
    <EuiLink {...rest} />
  </EuiReactRouterHelper>
);

export const EuiReactRouterButton: React.FC<TEuiReactRouterButtonProps> = ({
  to,
  onClick,
  ...rest
}) => (
  <EuiReactRouterHelper to={to} onClick={onClick}>
    <EuiButton {...rest} />
  </EuiReactRouterHelper>
);
