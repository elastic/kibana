/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { withSecuritySolutionLink } from '../../common/components/links';
import { NavLinkItem } from '../../common/components/navigation/types';

interface LandingImagesProps {
  items: NavLinkItem[];
}

const PrimaryEuiTitle = styled(EuiTitle)`
  color: ${(props) => props.theme.eui.euiColorPrimary};
`;

const LandingLinksDescripton = styled(EuiText)`
  padding-top: ${({ theme }) => theme.eui.euiSizeXS};
  max-width: 550px;
`;

const Link = styled.a`
  color: inherit;
`;

const StyledFlexItem = styled(EuiFlexItem)`
  align-items: center;
`;

const Content = styled(EuiFlexItem)`
  padding-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const SecuritySolutionLink = withSecuritySolutionLink(Link);

export const LandingLinksImages: React.FC<LandingImagesProps> = ({ items }) => (
  <EuiFlexGroup direction="column">
    {items.map(({ title, description, image, id }) => (
      <EuiFlexItem key={id} data-test-subj="LandingItem" style={{ width: '25.7143rem;' }}>
        <SecuritySolutionLink deepLinkId={id} tabIndex={-1}>
          {/* Empty onClick is to force hover style on `EuiPanel` */}
          <EuiPanel hasBorder hasShadow={false} paddingSize="m" onClick={() => {}}>
            <EuiFlexGroup>
              <StyledFlexItem grow={false}>
                {image && (
                  <EuiImage
                    data-test-subj="LandingLinksImage"
                    size="l"
                    role="presentation"
                    alt=""
                    src={image}
                  />
                )}
              </StyledFlexItem>
              <Content>
                <PrimaryEuiTitle size="s">
                  <h2>{title}</h2>
                </PrimaryEuiTitle>
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

// Fit the large card image
const LandingImageCardItem = styled(EuiFlexItem)`
  width: 25.71429rem;
`;

// Needed to use the primary color in the title underlining on hover
const PrimaryTitleCard = styled(EuiCard)`
  .euiCard__title {
    color: ${(props) => props.theme.eui.euiColorPrimary};
  }
`;

const LandingCardDescripton = styled(EuiText)`
  padding-top: ${({ theme }) => theme.eui.euiSizeXS};
`;

const SecuritySolutionCard = withSecuritySolutionLink(PrimaryTitleCard);

const LandingImageCardsComponent: React.FC<LandingImagesProps> = ({ items }) => (
  <EuiFlexGroup direction="row">
    {items.map(({ id, image, title, description }) => {
      return (
        <LandingImageCardItem key={id} data-test-subj="LandingImageCard-item" grow={false}>
          <SecuritySolutionCard
            deepLinkId={id}
            hasBorder
            textAlign="left"
            paddingSize="m"
            image={
              image && (
                <EuiImage
                  data-test-subj="LandingImageCard-image"
                  size="l"
                  role="presentation"
                  alt={title}
                  src={image}
                />
              )
            }
            title={
              <PrimaryEuiTitle size="xs">
                <h2>{title}</h2>
              </PrimaryEuiTitle>
            }
            description={
              <LandingCardDescripton size="xs" color="text">
                {description}
              </LandingCardDescripton>
            }
          />
        </LandingImageCardItem>
      );
    })}
  </EuiFlexGroup>
);

export const LandingImageCards = React.memo(LandingImageCardsComponent);
