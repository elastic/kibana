/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { SyntheticEvent } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiButtonProps,
  EuiLink,
  EuiLinkProps,
  PropsForAnchor,
  PropsForButton,
} from '@elastic/eui';
import styled from 'styled-components';

export const LinkButton: React.FC<
  PropsForButton<EuiButtonProps> | PropsForAnchor<EuiButtonProps>
> = ({ children, ...props }) => <EuiButton {...props}>{children}</EuiButton>;

export const LinkAnchor: React.FC<EuiLinkProps> = ({ children, ...props }) => (
  <EuiLink {...props}>{children}</EuiLink>
);

export const Comma = styled('span')`
  margin-right: 5px;
  margin-left: 5px;
  &::after {
    content: ' ,';
  }
`;

Comma.displayName = 'Comma';

const GenericLinkButtonComponent: React.FC<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  dataTestSubj?: string;
  href: string;
  onClick?: (e: SyntheticEvent) => void;
  title?: string;
  iconType?: string;
}> = ({ children, Component, dataTestSubj, href, onClick, title, iconType = 'expand' }) => {
  return Component ? (
    <Component
      data-test-subj={dataTestSubj}
      href={href}
      iconType={iconType}
      onClick={onClick}
      title={title}
    >
      {title ?? children}
    </Component>
  ) : (
    <LinkButton data-test-subj={dataTestSubj} href={href} onClick={onClick}>
      {title ?? children}
    </LinkButton>
  );
};

export const GenericLinkButton = React.memo(GenericLinkButtonComponent);

export const PortContainer = styled.div`
  & svg {
    position: relative;
    top: -1px;
  }
`;
