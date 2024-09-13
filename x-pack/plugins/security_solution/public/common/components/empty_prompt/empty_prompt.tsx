/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SecurityPageName } from '../../../../common';

import * as i18n from './translations';
import endpointSvg from './images/endpoint1.svg';
import cloudSvg from './images/cloud1.svg';
import siemSvg from './images/siem1.svg';
import { useNavigateTo } from '../../lib/kibana';
import { ONBOARDING_VIDEO_SOURCE } from '../../constants';
import { AddIntegrationsSteps } from '../landing_page/onboarding/types';

const imgUrls = {
  cloud: cloudSvg,
  siem: siemSvg,
  endpoint: endpointSvg,
};

const headerCardStyles = css`
  span.euiTitle {
    font-size: 36px;
    line-height: 100%;
  }
`;

const pageHeaderStyles = css`
  h1 {
    font-size: 18px;
  }
`;

const getFlexItemStyles = (euiTheme: EuiThemeComputed) => css`
  background: ${euiTheme.colors.lightestShade};
  padding: 20px;
`;

const cardStyles = css`
  img {
    margin-top: 20px;
    max-width: 400px;
  }
`;

const footerStyles = css`
  span.euiTitle {
    font-size: 36px;
    line-height: 100%;
  }
  max-width: 600px;
  display: block;
  margin: 20px auto 0;
`;

export const EmptyPromptComponent = memo(() => {
  const { euiTheme } = useEuiTheme();

  const { navigateTo } = useNavigateTo();

  const navigateToAddIntegrations = useCallback(() => {
    navigateTo({
      deepLinkId: SecurityPageName.landing,
      path: `#${AddIntegrationsSteps.connectToDataSources}`,
    });
  }, [navigateTo]);

  const onClick = useCallback(() => {
    navigateToAddIntegrations();
  }, [navigateToAddIntegrations]);

  return (
    <EuiFlexGroup data-test-subj="siem-landing-page" direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPageHeader
              pageTitle={i18n.SIEM_HEADER}
              iconType="logoSecurity"
              css={pageHeaderStyles}
            />
            <EuiCard
              display="plain"
              description={i18n.SIEM_DESCRIPTION}
              textAlign="left"
              title={i18n.SIEM_TITLE}
              footer={
                <EuiButton data-test-subj="add-integrations-header" onClick={onClick}>
                  {i18n.SIEM_CTA}
                </EuiButton>
              }
              css={headerCardStyles}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <iframe
              allowFullScreen
              className="vidyard_iframe"
              frameBorder="0"
              height="100%"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin"
              scrolling="no"
              src={ONBOARDING_VIDEO_SOURCE}
              title={i18n.SIEM_HEADER}
              width="100%"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem css={getFlexItemStyles(euiTheme)}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiCard
              hasBorder
              description={i18n.SIEM_CARD_DESCRIPTION}
              image={imgUrls.siem}
              textAlign="center"
              title={i18n.SIEM_CARD_TITLE}
              css={cardStyles}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              hasBorder
              description={i18n.ENDPOINT_DESCRIPTION}
              image={imgUrls.endpoint}
              textAlign="center"
              title={i18n.ENDPOINT_TITLE}
              css={cardStyles}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              hasBorder
              description={i18n.CLOUD_CARD_DESCRIPTION}
              image={imgUrls.cloud}
              textAlign="center"
              title={i18n.CLOUD_CARD_TITLE}
              css={cardStyles}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          display="plain"
          description={i18n.UNIFY_DESCRIPTION}
          paddingSize="l"
          textAlign="center"
          title={i18n.UNIFY_TITLE}
          footer={
            <EuiButton data-test-subj="add-integrations-footer" onClick={onClick}>
              {i18n.SIEM_CTA}
            </EuiButton>
          }
          css={footerStyles}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
EmptyPromptComponent.displayName = 'EmptyPromptComponent';

// eslint-disable-next-line import/no-default-export
export default EmptyPromptComponent;
