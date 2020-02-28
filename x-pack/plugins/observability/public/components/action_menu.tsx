/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPopover,
  EuiText,
  EuiListGroup,
  EuiSpacer,
  EuiHorizontalRule,
  EuiListGroupItem,
  EuiPopoverProps,
} from '@elastic/eui';

import React, { HTMLAttributes } from 'react';
import { EuiListGroupItemProps } from '@elastic/eui/src/components/list_group/list_group_item';
import styled from 'styled-components';

type Props = EuiPopoverProps & HTMLAttributes<HTMLDivElement>;

export const SectionTitle: React.FC<{}> = props => (
  <>
    <EuiText size={'s'} grow={false}>
      <h5>{props.children}</h5>
    </EuiText>
    <EuiSpacer size={'s'} />
  </>
);

export const SectionSubtitle: React.FC<{}> = props => (
  <>
    <EuiText size={'xs'} color={'subdued'} grow={false}>
      <small>{props.children}</small>
    </EuiText>
    <EuiSpacer size={'s'} />
  </>
);

export const SectionLinks: React.FC<{}> = props => (
  <EuiListGroup flush={true} bordered={false}>
    {props.children}
  </EuiListGroup>
);

export const SectionSpacer: React.FC<{}> = () => <EuiSpacer size={'l'} />;

export const Section = styled.div`
  margin-bottom: 24px;
  &:last-of-type {
    margin-bottom: 0;
  }
`;

export type SectionLinkProps = EuiListGroupItemProps;
export const SectionLink: React.FC<EuiListGroupItemProps> = props => (
  <EuiListGroupItem style={{ padding: 0 }} size={'s'} {...props} />
);

export const ActionMenuDivider: React.FC<{}> = props => <EuiHorizontalRule margin={'s'} />;

export const ActionMenu: React.FC<Props> = props => <EuiPopover {...props} ownFocus={true} />;
