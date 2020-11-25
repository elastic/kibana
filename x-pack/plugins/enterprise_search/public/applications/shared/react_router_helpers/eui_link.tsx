/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';
import { EuiLink, EuiButton, EuiButtonProps, EuiLinkAnchorProps, EuiPanel } from '@elastic/eui';
import { EuiPanelProps } from '@elastic/eui/src/components/panel/panel';

import { KibanaLogic } from '../kibana';
import { HttpLogic } from '../http';
import { letBrowserHandleEvent, createHref } from './';

/**
 * Generates EUI components with React-Router-ified links
 *
 * Based off of EUI's recommendations for handling React Router:
 * https://github.com/elastic/eui/blob/master/wiki/react-router.md#react-router-51
 */

interface EuiReactRouterProps {
  to: string;
  onClick?(): void;
  // Used to navigate outside of the React Router plugin basename but still within Kibana,
  // e.g. if we need to go from Enterprise Search to App Search
  shouldNotCreateHref?: boolean;
}

export const EuiReactRouterHelper: React.FC<EuiReactRouterProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  children,
}) => {
  const { navigateToUrl, history } = useValues(KibanaLogic);
  const { http } = useValues(HttpLogic);

  // Generate the correct link href (with basename etc. accounted for)
  const href = createHref(to, { history, http }, { shouldNotCreateHref });

  const reactRouterLinkClick = (event: React.MouseEvent) => {
    if (onClick) onClick(); // Run any passed click events (e.g. telemetry)
    if (letBrowserHandleEvent(event)) return; // Return early if the link behavior shouldn't be handled by React Router

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    // Perform SPA navigation.
    navigateToUrl(to, { shouldNotCreateHref });
  };

  const reactRouterProps = { href, onClick: reactRouterLinkClick };
  return React.cloneElement(children as React.ReactElement, reactRouterProps);
};

/**
 * Component helpers
 */

type EuiReactRouterLinkProps = EuiLinkAnchorProps & EuiReactRouterProps;
export const EuiReactRouterLink: React.FC<EuiReactRouterLinkProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => (
  <EuiReactRouterHelper {...{ to, onClick, shouldNotCreateHref }}>
    <EuiLink {...rest} />
  </EuiReactRouterHelper>
);

type EuiReactRouterButtonProps = EuiButtonProps & EuiReactRouterProps;
export const EuiReactRouterButton: React.FC<EuiReactRouterButtonProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => (
  <EuiReactRouterHelper {...{ to, onClick, shouldNotCreateHref }}>
    <EuiButton {...rest} />
  </EuiReactRouterHelper>
);

type EuiReactRouterPanelProps = EuiPanelProps & EuiReactRouterProps;
export const EuiReactRouterPanel: React.FC<EuiReactRouterPanelProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => (
  <EuiReactRouterHelper {...{ to, onClick, shouldNotCreateHref }}>
    <EuiPanel {...rest} />
  </EuiReactRouterHelper>
);
