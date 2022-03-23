/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPageHeader,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from './translations';
import endpointPng from '../../images/endpoint.png';
import siemPng from '../../images/siem.png';
import videoSvg from '../../images/video.svg';
import { ADD_DATA_PATH } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';

const imgUrls = {
  siem: siemPng,
  video: videoSvg,
  endpoint: endpointPng,
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

const StyledImgEuiCard = styled(EuiCard)`
  img {
    margin-top: 20px;
    max-width: 400px;
  }
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  background: ${({ theme }) => theme.eui.euiColorLightestShade};
  padding: 20px;
  margin: -12px !important;
`;

const ELASTIC_SECURITY_URL = `elastic.co/security`;

export const LandingCards = memo(() => {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;

  const tooltipContent = (
    <EuiLink color="ghost" href="https://elastic.co/security" target="_blank">
      {ELASTIC_SECURITY_URL}
    </EuiLink>
  );

  const href = useMemo(() => prepend(ADD_DATA_PATH), [prepend]);
  return (
    <EuiFlexGroup data-test-subj="siem-landing-page" direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <StyledEuiPageHeader pageTitle={i18n.SIEM_HEADER} iconType="logoSecurity" />
            <StyledEuiCard
              display="plain"
              description={i18n.SIEM_DESCRIPTION}
              textAlign="left"
              title={i18n.SIEM_TITLE}
              footer={<EuiButton href={href}>{i18n.SIEM_CTA}</EuiButton>}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiToolTip content={tooltipContent} position="top">
              <EuiLink href="https://www.elastic.co/security" external={false} target="_blank">
                <StyledEuiImage alt={i18n.SIEM_HEADER} size="xl" margin="l" src={imgUrls.video} />
              </EuiLink>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <StyledEuiFlexItem>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem>
            <StyledImgEuiCard
              hasBorder
              description={i18n.SIEM_CARD_DESCRIPTION}
              image={imgUrls.siem}
              textAlign="center"
              title={i18n.SIEM_CARD_TITLE}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <StyledImgEuiCard
              hasBorder
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
          footer={<EuiButton href={href}>{i18n.SIEM_CTA}</EuiButton>}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
LandingCards.displayName = 'LandingCards';
