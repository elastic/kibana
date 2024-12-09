/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { CardCallOut } from '../common/card_callout';
import { CardLinkButton } from '../common/card_link_button';
import dashboardsImageSrc from './images/dashboards.png';
import * as i18n from './translations';

export const DashboardsCard: OnboardingCardComponent = ({
  isCardComplete,
  setComplete,
  setExpandedCardId,
  isCardAvailable,
}) => {
  const isIntegrationsCardComplete = useMemo(
    () => isCardComplete(OnboardingCardId.integrations),
    [isCardComplete]
  );

  const isIntegrationsCardAvailable = useMemo(
    () => isCardAvailable(OnboardingCardId.integrations),
    [isCardAvailable]
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
          <EuiText data-test-subj="dashboardsDescription" size="s" color="subdued">
            {i18n.DASHBOARDS_CARD_DESCRIPTION}
          </EuiText>
          {isIntegrationsCardAvailable && !isIntegrationsCardComplete && (
            <>
              <EuiSpacer size="m" />
              <CardCallOut
                color="primary"
                icon="iInCircle"
                text={i18n.DASHBOARDS_CARD_CALLOUT_INTEGRATIONS_TEXT}
                action={
                  <EuiLink
                    data-test-subj="dashboardsCardCalloutLink"
                    onClick={expandIntegrationsCard}
                  >
                    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                      <EuiFlexItem>{i18n.DASHBOARDS_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="arrowRight" color="primary" size="s" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiLink>
                }
              />
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="dashboardsCardButton" grow={false}>
          <CardLinkButton
            onClick={() => setComplete(true)}
            linkId="goToDashboardsButton"
            cardId={OnboardingCardId.dashboards}
            deepLinkId={SecurityPageName.dashboards}
            fill
            isDisabled={isIntegrationsCardAvailable && !isIntegrationsCardComplete}
          >
            {i18n.DASHBOARDS_CARD_GO_TO_DASHBOARDS_BUTTON}
          </CardLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentImagePanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardsCard;
