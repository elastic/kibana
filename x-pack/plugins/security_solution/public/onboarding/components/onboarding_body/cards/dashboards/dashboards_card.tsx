/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { DASHBOARDS_CARD_TITLE } from './translations';
import dashboardsImageSrc from './images/dashboards.png';

export const DashboardsCard: OnboardingCardComponent = ({ setComplete }) => {
  return (
    <OnboardingCardContentImagePanel imageSrc={dashboardsImageSrc} imageAlt={DASHBOARDS_CARD_TITLE}>
      <EuiFlexGroup
        direction="column"
        gutterSize="xl"
        justifyContent="flexStart"
        alignItems="flexStart"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.onboarding.dashboardsCard.description"
              defaultMessage="Use dashboards to visualize data and stay up-to-date with key information. Create your own, or use Elastic's default dashboards — including alerts, user authentication events, known vulnerabilities, and more."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiCallOut color="primary">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="iInCircle" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <FormattedMessage
                    id="xpack.securitySolution.onboarding.dashboardsCard.calloutIntegrationsText"
                    defaultMessage="To view dashboards add integrations first"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <EuiLink href={`#${OnboardingCardId.integrations}`}>
                    <FormattedMessage
                      id="xpack.securitySolution.onboarding.dashboardsCard.calloutIntegrationsButton"
                      defaultMessage="Add integrations"
                    />
                    <EuiIcon type="arrowRight" color="primary" size="s" />
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={() => setComplete(false)} fill>
            <FormattedMessage
              id="xpack.securitySolution.onboarding.dashboardsCard.goToDashboardsButton"
              defaultMessage="Go to dashboards"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentImagePanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardsCard;
