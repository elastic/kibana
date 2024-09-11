/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { CardCallout } from '../common/card_callout';
import dashboardsImageSrc from './images/dashboards.png';
import * as i18n from './translations';

export const DashboardsCard: OnboardingCardComponent = ({ isCardComplete, setExpandedCardId }) => {
  const isIntegrationsCardComplete = useMemo(
    () => isCardComplete(OnboardingCardId.integrations),
    [isCardComplete]
  );

  const expandIntegrationsCard = useCallback(() => {
    setExpandedCardId(OnboardingCardId.integrations, { scroll: true });
  }, [setExpandedCardId]);

  return (
    <OnboardingCardContentImagePanel
      imageSrc={dashboardsImageSrc}
      imageAlt={i18n.DASHBOARDS_CARD_TITLE}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="xl"
        justifyContent="flexStart"
        alignItems="flexStart"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.DASHBOARDS_CARD_DESCRIPTION}
          </EuiText>
          {!isIntegrationsCardComplete && (
            <>
              <EuiSpacer size="m" />
              <CardCallout
                color="primary"
                icon="iInCircle"
                text={i18n.DASHBOARDS_CARD_CALLOUT_INTEGRATIONS_TEXT}
                action={
                  <EuiLink onClick={expandIntegrationsCard}>
                    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                      <EuiFlexItem>{i18n.DASHBOARDS_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="arrowRight" color="primary" size="s" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiLink>
                }
              />
              {/* <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="iInCircle" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">{i18n.DASHBOARDS_CARD_CALLOUT_INTEGRATIONS_TEXT}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <EuiLink onClick={expandIntegrationsCard}>
                        {i18n.DASHBOARDS_CARD_CALLOUT_INTEGRATIONS_BUTTON}
                        <EuiIcon type="arrowRight" color="primary" size="s" />
                      </EuiLink>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup> */}
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SecuritySolutionLinkButton
            deepLinkId={SecurityPageName.dashboards}
            fill
            isDisabled={!isIntegrationsCardComplete}
          >
            {i18n.DASHBOARDS_CARD_GO_TO_DASHBOARDS_BUTTON}
          </SecuritySolutionLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentImagePanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardsCard;
