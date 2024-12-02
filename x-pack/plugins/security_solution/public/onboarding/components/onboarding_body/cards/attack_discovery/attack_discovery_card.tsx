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
import { OnboardingCardContentAssetPanel } from '../common/card_content_asset_panel';
import { CardCallOut } from '../common/card_callout';
import attackDiscoveryImageSrc from './images/attack_discovery.png';
import * as i18n from './translations';
import { CardAssetType } from '../types';

export const AttackDiscoveryCard: OnboardingCardComponent = React.memo(
  ({ isCardComplete, setExpandedCardId, setComplete }) => {
    const isIntegrationsCardComplete = useMemo(
      () => isCardComplete(OnboardingCardId.integrations),
      [isCardComplete]
    );

    const expandIntegrationsCard = useCallback(() => {
      setExpandedCardId(OnboardingCardId.integrations, { scroll: true });
    }, [setExpandedCardId]);

    return (
      <OnboardingCardContentAssetPanel
        asset={{
          type: CardAssetType.image,
          source: attackDiscoveryImageSrc,
          alt: i18n.ATTACK_DISCOVERY_CARD_TITLE,
        }}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="xl"
          justifyContent="flexStart"
          alignItems="flexStart"
        >
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="attackDiscoveryCardDescription" size="s" color="subdued">
              {i18n.ATTACK_DISCOVERY_CARD_DESCRIPTION}
            </EuiText>
            {!isIntegrationsCardComplete && (
              <>
                <EuiSpacer size="m" />
                <CardCallOut
                  color="primary"
                  icon="iInCircle"
                  text={i18n.ATTACK_DISCOVERY_CARD_CALLOUT_INTEGRATIONS_TEXT}
                  action={
                    <EuiLink onClick={expandIntegrationsCard}>
                      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                        <EuiFlexItem>
                          {i18n.ATTACK_DISCOVERY_CARD_CALLOUT_INTEGRATIONS_BUTTON}
                        </EuiFlexItem>
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
          <EuiFlexItem data-test-subj="attackDiscoveryCardButton" grow={false}>
            <SecuritySolutionLinkButton
              onClick={() => setComplete(true)}
              deepLinkId={SecurityPageName.attackDiscovery}
              fill
              isDisabled={!isIntegrationsCardComplete}
            >
              {i18n.ATTACK_DISCOVERY_CARD_START_ATTACK_DISCOVERY_BUTTON}
            </SecuritySolutionLinkButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </OnboardingCardContentAssetPanel>
    );
  }
);
AttackDiscoveryCard.displayName = 'AttackDiscoveryCard';

// eslint-disable-next-line import/no-default-export
export default AttackDiscoveryCard;
