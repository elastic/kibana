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
import { METRIC_TYPE } from '@kbn/analytics';
import React from 'react';
import styled from 'styled-components';
import { withSecuritySolutionLink } from '../links';
import { NavItemBetaBadge } from '../navigation/nav_item_beta_badge';
import type { NavLinkItem } from '../navigation/types';
import { TELEMETRY_EVENT, track } from '../../lib/telemetry';

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

const FlexTitle = styled.div`
  display: flex;
  align-items: center;
`;

const TitleText = styled.h2`
  display: inline;
`;

const SecuritySolutionLink = withSecuritySolutionLink(Link);

export const LandingLinksImages: React.FC<LandingImagesProps> = ({ items }) => (
  <EuiFlexGroup direction="column">
    {items.map(({ title, description, image, id, isBeta, betaOptions }) => (
      <EuiFlexItem key={id} data-test-subj="LandingItem">
        <SecuritySolutionLink
          deepLinkId={id}
          tabIndex={-1}
          onClick={() => {
            track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.LANDING_CARD}${id}`);
          }}
        >
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
                  <FlexTitle>
                    <TitleText>{title}</TitleText>
                    {isBeta && <NavItemBetaBadge text={betaOptions?.text} />}
                  </FlexTitle>
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

const CARD_WIDTH = 320;
const LandingImageCardItem = styled(EuiFlexItem)`
  max-width: ${CARD_WIDTH}px;
`;

const LandingCardDescription = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  padding-top: ${({ theme }) => theme.eui.euiSizeXS};
`;

// Needed to use the primary color in the title underlining on hover
const PrimaryTitleCard = styled(EuiCard)`
  .euiCard__title {
    color: ${(props) => props.theme.eui.euiColorPrimary};
  }
`;

const SecuritySolutionCard = withSecuritySolutionLink(PrimaryTitleCard);

export const LandingImageCards: React.FC<LandingImagesProps> = React.memo(({ items }) => (
  <EuiFlexGroup direction="row" wrap>
    {items.map(({ id, image, title, description, isBeta, betaOptions }) => (
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
                role="presentation"
                size={CARD_WIDTH}
                alt={title}
                src={image}
              />
            )
          }
          title={
            <PrimaryEuiTitle size="xs">
              <FlexTitle>
                <TitleText>{title}</TitleText>
                {isBeta && <NavItemBetaBadge text={betaOptions?.text} />}
              </FlexTitle>
            </PrimaryEuiTitle>
          }
          description={<LandingCardDescription>{description}</LandingCardDescription>}
          onClick={() => {
            track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.LANDING_CARD}${id}`);
          }}
        />
      </LandingImageCardItem>
    ))}
  </EuiFlexGroup>
));

LandingImageCards.displayName = 'LandingImageCards';
