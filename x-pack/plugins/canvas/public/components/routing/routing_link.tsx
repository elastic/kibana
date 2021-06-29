/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiLink,
  EuiLinkProps,
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiButtonEmptyProps,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';

interface RoutingProps {
  to: string;
}

type ComponentProps<P> = Omit<P, 'href' | 'onClick'> & RoutingProps;

export const RoutingLink: FC<ComponentProps<EuiLinkProps>> = ({ to, ...rest }) => {
  const history = useHistory();

  // Generate the correct link href (with basename accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href };

  return <EuiLink {...(props as EuiLinkProps)} />;
};

export const RoutingButtonEmpty: FC<ComponentProps<EuiButtonEmptyProps>> = ({ to, ...rest }) => {
  const history = useHistory();

  // Generate the correct link href (with basename accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href };

  return <EuiButtonEmpty {...(props as EuiButtonEmptyProps)} />;
};

export const RoutingButtonIcon: FC<ComponentProps<EuiButtonIconProps>> = ({ to, ...rest }) => {
  const history = useHistory();

  // Generate the correct link href (with basename accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href };

  return <EuiButtonIcon {...props} />;
};
