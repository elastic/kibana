/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiLink, EuiLinkProps, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

interface RoutingProps {
  to: string;
}

type RoutingLinkProps = Omit<EuiLinkProps, 'href' | 'onClick'> & RoutingProps;

export const RoutingLink: FC<RoutingLinkProps> = ({ to, ...rest }) => {
  const history = useHistory();

  // Generate the correct link href (with basename accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href } as EuiLinkProps;

  return <EuiLink {...props} />;
};

type RoutingButtonIconProps = Omit<EuiButtonIconProps, 'href' | 'onClick'> & RoutingProps;

export const RoutingButtonIcon: FC<RoutingButtonIconProps> = ({ to, ...rest }) => {
  const history = useHistory();

  // Generate the correct link href (with basename accounted for)
  const href = history.createHref({ pathname: to });

  const props = { ...rest, href } as EuiButtonIconProps;

  return <EuiButtonIcon {...props} />;
};
