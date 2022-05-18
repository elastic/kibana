/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { HttpLogic } from '../http';
import { KibanaLogic } from '../kibana';

import { letBrowserHandleEvent, createHref } from '.';

/**
 * Generates the `href` and `onClick` props for React-Router-friendly links
 *
 * Based off of EUI's recommendations for handling React Router:
 * https://github.com/elastic/eui/blob/master/wiki/react-router.md#react-router-51
 *
 * but separated out from EuiLink portion as we use this for multiple EUI components
 */

export interface ReactRouterProps {
  to: string;
  onClick?(): void;
  // Used to navigate outside of the React Router plugin basename but still within Kibana,
  // e.g. if we need to go from Enterprise Search to App Search
  shouldNotCreateHref?: boolean;
}

export const generateReactRouterProps = ({
  to,
  onClick,
  shouldNotCreateHref,
}: ReactRouterProps) => {
  const { navigateToUrl, history } = KibanaLogic.values;
  const { http } = HttpLogic.values;

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

  return { href, onClick: reactRouterLinkClick };
};
