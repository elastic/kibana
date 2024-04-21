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
  EuiBadge,
  EuiBadgeProps,
} from '@elastic/eui';
import { EuiPanelProps } from '@elastic/eui/src/components/panel/panel';

import { generateReactRouterProps, ReactRouterProps } from '.';

/**
 * Correctly typed component helpers with React-Router-friendly `href` and `onClick` props
 */

type ReactRouterEuiLinkProps = ReactRouterProps & EuiLinkAnchorProps;
export const EuiLinkTo = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}: ReactRouterEuiLinkProps) => (
  <EuiLink {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiButtonProps = ReactRouterProps & EuiButtonProps;
export const EuiButtonTo = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}: ReactRouterEuiButtonProps) => (
  <EuiButton {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiButtonEmptyProps = ReactRouterProps & EuiButtonEmptyProps;
export const EuiButtonEmptyTo = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}: ReactRouterEuiButtonEmptyProps) => (
  <EuiButtonEmpty {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiButtonIconProps = ReactRouterProps & EuiButtonIconProps;
export const EuiButtonIconTo = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}: ReactRouterEuiButtonIconProps) => (
  <EuiButtonIcon {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiPanelProps = ReactRouterProps & EuiPanelProps;
export const EuiPanelTo = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}: ReactRouterEuiPanelProps) => (
  <EuiPanel {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiCardProps = ReactRouterProps & EuiCardProps;
export const EuiCardTo = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}: ReactRouterEuiCardProps) => (
  <EuiCard {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

type ReactRouterEuiListGroupItemProps = ReactRouterProps & EuiListGroupItemProps;
export const EuiListGroupItemTo = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}: ReactRouterEuiListGroupItemProps) => (
  <EuiListGroupItem {...rest} {...generateReactRouterProps({ to, onClick, shouldNotCreateHref })} />
);

// TODO Right now this only supports the `color` prop of EuiBadgeProps
// Trying to use EuiBadgeProps in its entirety causes a succession of Typescript errors
type ReactRouterEuiBadgeProps = ReactRouterProps & Pick<EuiBadgeProps, 'color'> & { label: string };
export const EuiBadgeTo = ({
  label,
  onClick,
  shouldNotCreateHref,
  to,
  ...rest
}: ReactRouterEuiBadgeProps) => {
  const routerProps = generateReactRouterProps({ onClick, shouldNotCreateHref, to });

  const badgeProps: EuiBadgeProps = {
    ...rest,
    iconOnClick: routerProps.onClick,
    iconOnClickAriaLabel: label,
    onClick: routerProps.onClick,
    onClickAriaLabel: label,
  };

  return (
    <EuiBadge {...badgeProps} className="enterpriseSearchEuiBadgeTo">
      {label}
    </EuiBadge>
  );
};
