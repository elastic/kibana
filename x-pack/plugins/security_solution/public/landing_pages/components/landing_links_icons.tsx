/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { NavItemBetaBadge } from '../../common/components/navigation/nav_item_beta_badge';
import {
  SecuritySolutionLinkAnchor,
  withSecuritySolutionLink,
} from '../../common/components/links';
import type { NavLinkItem } from '../../common/components/navigation/types';

interface LandingLinksImagesProps {
  items: NavLinkItem[];
}

const Link = styled.a`
  color: inherit;
`;

const SecuritySolutionLink = withSecuritySolutionLink(Link);

const Description = styled(EuiFlexItem)`
  max-width: 22em;
`;

const StyledEuiTitle = styled(EuiTitle)`
  margin-top: ${({ theme }) => theme.eui.euiSizeM};
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

export const LandingLinksIcons: React.FC<LandingLinksImagesProps> = ({ items }) => (
  <EuiFlexGrid columns={3} gutterSize="xl">
    {items.map(({ title, description, id, icon, isBeta, betaOptions }) => (
      <EuiFlexItem key={id} data-test-subj="LandingItem">
        <EuiFlexGroup
          direction="column"
          alignItems="flexStart"
          gutterSize="none"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <SecuritySolutionLink tabIndex={-1} deepLinkId={id}>
              <EuiIcon aria-hidden="true" size="xl" type={icon ?? ''} role="presentation" />
            </SecuritySolutionLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StyledEuiTitle size="xxs">
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem grow={false}>
                  <SecuritySolutionLinkAnchor deepLinkId={id} data-test-subj={`nav-link-${id}`}>
                    <h2>{title}</h2>
                  </SecuritySolutionLinkAnchor>
                </EuiFlexItem>
                {isBeta && (
                  <EuiFlexItem grow={false}>
                    <NavItemBetaBadge text={betaOptions?.text} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </StyledEuiTitle>
          </EuiFlexItem>
          <Description>
            <EuiText size="s" color="text">
              {description}
            </EuiText>
          </Description>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);
