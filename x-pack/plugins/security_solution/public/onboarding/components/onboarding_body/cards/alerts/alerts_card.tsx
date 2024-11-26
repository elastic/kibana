/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { css } from '@emotion/css';
import { useStoredSelectedCardItemId } from '../../../../hooks/use_stored_state';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentAssetPanel } from '../common/card_content_asset_panel';
import { CardCallOut } from '../common/card_callout';
import * as i18n from './translations';
import type { CardSelectorListItem } from '../common/card_selector_list';
import { CardSelectorList } from '../common/card_selector_list';
import { ALERTS_CARD_ITEMS_BY_ID, ALERTS_CARD_ITEMS } from './alerts_card_config';
import { useOnboardingContext } from '../../../onboarding_context';
import { DEFAULT_ALERTS_CARD_ITEM_SELECTED } from './constants';

export const AlertsCard: OnboardingCardComponent = ({
  isCardComplete,
  setExpandedCardId,
  setComplete,
}) => {
  const { spaceId } = useOnboardingContext();
  const [toggleIdSelected, setStoredSelectedAlertsCardItemId] = useStoredSelectedCardItemId(
    'alerts',
    spaceId,
    DEFAULT_ALERTS_CARD_ITEM_SELECTED.id
  );

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
      setSelectedCardItem(ALERTS_CARD_ITEMS_BY_ID[item.id]);
      setStoredSelectedAlertsCardItemId(item.id);
    },
    [setStoredSelectedAlertsCardItemId]
  );

  return (
    <OnboardingCardContentAssetPanel asset={selectedCardItem.asset}>
      <EuiFlexGroup
        direction="column"
        gutterSize="xl"
        justifyContent="flexStart"
        alignItems="flexStart"
      >
        <EuiFlexItem
          className={css`
            width: 100%;
          `}
        >
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
    </OnboardingCardContentAssetPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AlertsCard;
