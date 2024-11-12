/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useStoredSelectedAlertsCardItemId } from '../../../../hooks/use_stored_state';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { CardCallOut } from '../common/card_callout';
import * as i18n from './translations';
import type { CardSelectorListItem } from '../common/card_selector_list';
import { CardSelectorList } from '../common/card_selector_list';
import { DEFAULT_ALERTS_CARD_ITEM_SELECTED } from './constants';
import { ALERTS_CARD_ITEMS, ALERTS_CARD_ITEMS_BY_ID } from './alerts_card_config';
import { useOnboardingContext } from '../../../onboarding_context';

export const AlertsCard: OnboardingCardComponent = ({
  isCardComplete,
  setExpandedCardId,
  setComplete,
  isExpanded,
}) => {
  const { spaceId } = useOnboardingContext();

  const [toggleIdSelected, setSelectedAlertsCardItemIdToStorage] =
    useStoredSelectedAlertsCardItemId(spaceId, DEFAULT_ALERTS_CARD_ITEM_SELECTED.id);
  const [selectedCardItem, setSelectedCardItem] = useState(
    ALERTS_CARD_ITEMS_BY_ID[toggleIdSelected]
  );

  const isIntegrationsCardComplete = useMemo(
    () => isCardComplete(OnboardingCardId.integrations),
    [isCardComplete]
  );

  const expandIntegrationsCard = useCallback(() => {
    setExpandedCardId(OnboardingCardId.integrations, { scroll: true });
  }, [setExpandedCardId]);

  const onSelectCard = useCallback(
    (item: CardSelectorListItem) => {
      setSelectedCardItem(item);
      setSelectedAlertsCardItemIdToStorage(item.id);
    },
    [setSelectedAlertsCardItemIdToStorage]
  );

  const [isVisible, setIsVisible] = useState(true);

  // /////////////// improve this implementation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!isExpanded) {
      timeoutId = setTimeout(() => setIsVisible(false), 350);
    } else {
      setIsVisible(true); // Reset visibility when expanded
    }
    return () => clearTimeout(timeoutId); // Cleanup timeout on component unmount or dependency change
  }, [isExpanded]);

  if (!isVisible) return null;

  return (
    <OnboardingCardContentImagePanel media={selectedCardItem.asset}>
      <EuiFlexGroup
        direction="column"
        gutterSize="xl"
        justifyContent="flexStart"
        alignItems="flexStart"
      >
        <EuiFlexItem style={{ width: '100%' }}>
          <EuiText data-test-subj="alertsCardDescription" size="s">
            {i18n.ALERTS_CARD_DESCRIPTION}
          </EuiText>
          <EuiSpacer />
          <CardSelectorList
            title={i18n.ALERTS_CARD_STEP_SELECTOR_TITLE}
            items={ALERTS_CARD_ITEMS}
            onSelect={onSelectCard}
            selectedItem={selectedCardItem}
          />
          {!isIntegrationsCardComplete && (
            <>
              <EuiSpacer size="m" />
              <CardCallOut
                color="primary"
                icon="iInCircle"
                text={i18n.ALERTS_CARD_CALLOUT_INTEGRATIONS_TEXT}
                action={
                  <EuiLink onClick={expandIntegrationsCard}>
                    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                      <EuiFlexItem>{i18n.ALERTS_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
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
        <EuiFlexItem data-test-subj="alertsCardButton" grow={false}>
          <SecuritySolutionLinkButton
            onClick={() => setComplete(true)}
            deepLinkId={SecurityPageName.alerts}
            fill
            isDisabled={!isIntegrationsCardComplete}
          >
            {i18n.ALERTS_CARD_VIEW_ALERTS_BUTTON}
          </SecuritySolutionLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentImagePanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AlertsCard;
