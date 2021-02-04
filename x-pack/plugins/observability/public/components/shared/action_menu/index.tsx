/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPopover,
  EuiText,
  EuiListGroup,
  EuiSpacer,
  EuiHorizontalRule,
  EuiListGroupItem,
  EuiPopoverProps,
  EuiListGroupItemProps,
} from '@elastic/eui';
import React, { HTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';
import { EuiListGroupProps } from '@elastic/eui';

type Props = EuiPopoverProps & HTMLAttributes<HTMLDivElement>;

export function SectionTitle({ children }: { children?: ReactNode }) {
  return (
    <>
      <EuiText size={'s'} grow={false}>
        <h5>{children}</h5>
      </EuiText>
      <EuiSpacer size={'xs'} />
    </>
  );
}

export function SectionSubtitle({ children }: { children?: ReactNode }) {
  return (
    <>
      <EuiText size={'xs'} color={'subdued'} grow={false}>
        <small>{children}</small>
      </EuiText>
      <EuiSpacer size={'s'} />
    </>
  );
}

export function SectionLinks({ children, ...props }: { children?: ReactNode } & EuiListGroupProps) {
  return (
    <EuiListGroup {...props} flush={true} bordered={false}>
      {children}
    </EuiListGroup>
  );
}

export function SectionSpacer() {
  return <EuiSpacer size={'l'} />;
}

export const Section = styled.div`
  margin-bottom: 16px;
  &:last-of-type {
    margin-bottom: 0;
  }
`;

export type SectionLinkProps = EuiListGroupItemProps;
export function SectionLink(props: SectionLinkProps) {
  return <EuiListGroupItem style={{ padding: 0 }} size={'xs'} {...props} />;
}

export function ActionMenuDivider() {
  return <EuiHorizontalRule margin={'s'} />;
}

export function ActionMenu(props: Props) {
  return <EuiPopover {...props} ownFocus={true} />;
}
