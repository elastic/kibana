/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPageHeader,
} from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from './translations';
import endpointSvg from '../../images/endpoint.svg';
import siemSvg from '../../images/siem.svg';
import videoSvg from '../../images/video.svg';

const imgUrls = {
  siem: siemSvg,
  video: videoSvg,
  endpoint: endpointSvg,
};

const StyledEuiCard = styled(EuiCard)`
  span.euiTitle {
    font-size: 36px;
    line-height: 100%;
  }
`;
const StyledEuiCardTop = styled(EuiCard)`
  span.euiTitle {
    font-size: 36px;
    line-height: 100%;
  }
  max-width: 600px;
  display: block;
  margin: 20px auto 0;
`;
const StyledEuiPageHeader = styled(EuiPageHeader)`
  h1 {
    font-size: 18px;
  }
`;

const StyledEuiImage = styled(EuiImage)`
  img {
    display: block;
    margin: 0 auto;
  }
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  background: ${({ theme }) => theme.eui.euiColorLightestShade};
  padding: 20px;
  margin: -12px !important;
`;

export const LandingCards = memo(() => (
  <EuiFlexGroup direction="column" gutterSize="l">
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <StyledEuiPageHeader pageTitle={i18n.SIEM_HEADER} iconType="logoSecurity" />
          <StyledEuiCard
            display="plain"
            description={i18n.SIEM_DESCRIPTION}
            textAlign="left"
            title={i18n.SIEM_TITLE}
            footer={<EuiButton href="#">{i18n.SIEM_CTA}</EuiButton>}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLink href="https://www.elastic.co/security" external={false} target="_blank">
            <StyledEuiImage alt={i18n.SIEM_HEADER} size="xl" margin="l" src={imgUrls.video} />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <StyledEuiFlexItem>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <EuiCard
            description={i18n.SIEM_CARD_DESCRIPTION}
            image={imgUrls.siem}
            textAlign="center"
            title={i18n.SIEM_CARD_TITLE}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            description={i18n.ENDPOINT_DESCRIPTION}
            image={imgUrls.endpoint}
            textAlign="center"
            title={i18n.ENDPOINT_TITLE}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledEuiFlexItem>
    <EuiFlexItem>
      <StyledEuiCardTop
        display="plain"
        description={i18n.UNIFY_DESCRIPTION}
        paddingSize="l"
        textAlign="center"
        title={i18n.UNIFY_TITLE}
        footer={<EuiButton href="#">{i18n.SIEM_CTA}</EuiButton>}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
));
LandingCards.displayName = 'LandingCards';
