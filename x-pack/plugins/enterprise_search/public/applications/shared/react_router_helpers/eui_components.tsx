/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiLink,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiButtonProps,
  EuiLinkAnchorProps,
  EuiListGroupItem,
  EuiListGroupItemProps,
  EuiPanel,
  EuiCard,
  EuiCardProps,
} from '@elastic/eui';
import { EuiPanelProps } from '@elastic/eui/src/components/panel/panel';

import { generateReactRouterProps, ReactRouterProps } from './';

/**
 * Correctly typed component helpers with React-Router-friendly `href` and `onClick` props
 */

type ReactRouterEuiLinkProps = ReactRouterProps & EuiLinkAnchorProps;
export const EuiLinkTo: React.FC<ReactRouterEuiLinkProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => <EuiLink {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />;

type ReactRouterEuiButtonProps = ReactRouterProps & EuiButtonProps;
export const EuiButtonTo: React.FC<ReactRouterEuiButtonProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => <EuiButton {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />;

type ReactRouterEuiButtonEmptyProps = ReactRouterProps & EuiButtonEmptyProps;
export const EuiButtonEmptyTo: React.FC<ReactRouterEuiButtonEmptyProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => (
  <EuiButtonEmpty {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiButtonIconProps = ReactRouterProps & EuiButtonIconProps;
export const EuiButtonIconTo: React.FC<ReactRouterEuiButtonIconProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => (
  <EuiButtonIcon {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiPanelProps = ReactRouterProps & EuiPanelProps;
export const EuiPanelTo: React.FC<ReactRouterEuiPanelProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => <EuiPanel {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />;

type ReactRouterEuiCardProps = ReactRouterProps & EuiCardProps;
export const EuiCardTo: React.FC<ReactRouterEuiCardProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => <EuiCard {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />;

type ReactRouterEuiListGroupItemProps = ReactRouterProps & EuiListGroupItemProps;
export const EuiListGroupItemTo: React.FC<ReactRouterEuiListGroupItemProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => (
  <EuiListGroupItem {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);
