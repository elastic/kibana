/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, MouseEvent } from 'react';
import { EuiLink, EuiLinkProps, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

interface RoutingProps {
  to: string;
}

type RoutingLinkProps = Omit<EuiLinkProps, 'href' | 'onClick'> & RoutingProps;

const isModifiedEvent = (event: MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: MouseEvent) => event.button === 0;

const isTargetBlank = (event: MouseEvent) => {
  const target = (event.target as HTMLElement).getAttribute('target');
  return target && target !== '_self';
};

export const RoutingLink: FC<RoutingLinkProps> = ({ to, ...rest }) => {
  const history = useHistory();

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      // Let the browser handle links that open new tabs/windows
      if (isModifiedEvent(event) || !isLeftClickEvent(event) || isTargetBlank(event)) {
        return;
      }

      // Prevent regular link behavior, which causes a browser refresh.
      event.preventDefault();

      // Push the route to the history.
      history.push(to);
    },
    [history, to]
  );

  // Generate the correct link href (with basename accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href, onClick } as EuiLinkProps;

  return <EuiLink {...props} />;
};

type RoutingButtonIconProps = Omit<EuiButtonIconProps, 'href' | 'onClick'> & RoutingProps;

export const RoutingButtonIcon: FC<RoutingButtonIconProps> = ({ to, ...rest }) => {
  const history = useHistory();

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      // Let the browser handle links that open new tabs/windows
      if (isModifiedEvent(event) || !isLeftClickEvent(event) || isTargetBlank(event)) {
        return;
      }

      // Prevent regular link behavior, which causes a browser refresh.
      event.preventDefault();

      // Push the route to the history.
      history.push(to);
    },
    [history, to]
  );

  // Generate the correct link href (with basename accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href, onClick } as EuiButtonIconProps;

  return <EuiButtonIcon {...props} />;
};
