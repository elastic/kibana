/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiListGroup,
  EuiSpacer,
  EuiListGroupItem,
  EuiListGroupItemProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { EuiListGroupProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
    <EuiListGroup {...props} size={'s'} color={'primary'} flush={true} bordered={false}>
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
export function SectionLink({
  showNewBadge,
  ...props
}: SectionLinkProps & { showNewBadge?: boolean }) {
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>
        <EuiListGroupItem style={{ padding: 0 }} size={'xs'} {...props} />
      </EuiFlexItem>
      {showNewBadge && (
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EuiBadge color="accent">
            {i18n.translate('xpack.observabilityShared.sectionLink.newLabel', {
              defaultMessage: 'New',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
