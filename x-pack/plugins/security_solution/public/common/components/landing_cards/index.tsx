/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiButton, EuiCard, EuiFlexGroup, EuiFlexItem, EuiPageHeader } from '@elastic/eui';
import styled from 'styled-components';
import { useVariation } from '../utils';
import * as i18n from './translations';
import endpointSvg from '../../images/endpoint1.svg';
import cloudSvg from '../../images/cloud1.svg';
import siemSvg from '../../images/siem1.svg';
import { ADD_DATA_PATH } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana';

const imgUrls = {
  cloud: cloudSvg,
  siem: siemSvg,
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

export const LandingCards = memo(() => {
  const {
    http: {
      basePath: { prepend },
    },
    cloudExperiments,
  } = useKibana().services;

  const [addIntegrationsUrl, setAddIntegrationsUrl] = useState(ADD_DATA_PATH);
  useVariation(
    cloudExperiments,
    'security-solutions.add-integrations-url',
    ADD_DATA_PATH,
    setAddIntegrationsUrl
  );

  const href = useMemo(() => prepend(addIntegrationsUrl), [prepend, addIntegrationsUrl]);
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
              footer={
                <EuiButton data-test-subj="add-integrations-header" href={href}>
                  {i18n.SIEM_CTA}
                </EuiButton>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <iframe
              allowFullScreen
              allowTransparency
              className="vidyard_iframe"
              frameBorder="0"
              height="100%"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin"
              scrolling="no"
              src="//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?"
              title={i18n.SIEM_HEADER}
              width="100%"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <StyledEuiFlexItem>
        <EuiFlexGroup gutterSize="m">
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
          <EuiFlexItem>
            <StyledImgEuiCard
              hasBorder
              description={i18n.CLOUD_CARD_DESCRIPTION}
              image={imgUrls.cloud}
              textAlign="center"
              title={i18n.CLOUD_CARD_TITLE}
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
          footer={
            <EuiButton data-test-subj="add-integrations-footer" href={href}>
              {i18n.SIEM_CTA}
            </EuiButton>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
LandingCards.displayName = 'LandingCards';
