/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { SecurityPageName } from '../../app/types';
import { withSecuritySolutionLink } from '../../common/components/links';
import * as i18n from './translations';

interface LandingLinksImagesProps {
  items: NavItem[];
}

export interface NavItem {
  id: SecurityPageName;
  label: string;
  image: string;
  description: string;
  path?: string;
}

const PrimatyEuiTitle = styled(EuiTitle)`
  color: ${(props) => props.theme.eui.euiColorPrimary};
`;

const LandingLinksDescripton = styled(EuiText)`
  padding-top: ${({ theme }) => theme.eui.paddingSizes.xs};
  max-width: 550px;
`;

const Link = styled.a`
  color: inherit;
`;

const StyledFlexItem = styled(EuiFlexItem)`
  align-items: center;
`;

const SecuritySolutionLink = withSecuritySolutionLink(Link);

const Content = styled(EuiFlexItem)`
  padding-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

export const LandingLinksImages: React.FC<LandingLinksImagesProps> = ({ items }) => (
  <EuiFlexGroup direction="column">
    {items.map(({ label, description, path, image, id }) => (
      <EuiFlexItem key={id}>
        <SecuritySolutionLink deepLinkId={id} path={path}>
          {/* Empty onClick is to force hover style on `EuiPanel` */}
          <EuiPanel hasBorder hasShadow={false} paddingSize="m" onClick={() => {}}>
            <EuiFlexGroup>
              <StyledFlexItem grow={false}>
                <EuiImage size="l" alt={i18n.SCREENSHOT_IMAGE_ALT(label)} src={image} />
              </StyledFlexItem>
              <Content>
                <PrimatyEuiTitle size="s">
                  <h2>{label}</h2>
                </PrimatyEuiTitle>
                <LandingLinksDescripton size="s" color="text">
                  {description}
                </LandingLinksDescripton>
              </Content>
            </EuiFlexGroup>
          </EuiPanel>
        </SecuritySolutionLink>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
