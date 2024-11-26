/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useStoredSelectedCardItemId } from '../../../../hooks/use_stored_state';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentAssetPanel } from '../common/card_content_asset_panel';
import { CardCallOut } from '../common/card_callout';
import { CardLinkButton } from '../common/card_link_button';
import * as i18n from './translations';
import type { CardSelectorListItem } from '../common/card_selector_list';
import { CardSelectorList } from '../common/card_selector_list';
import { DASHBOARDS_CARD_ITEMS_BY_ID, DASHBOARDS_CARD_ITEMS } from './dashboards_card_config';
import { useOnboardingContext } from '../../../onboarding_context';
import { DEFAULT_DASHBOARDS_CARD_ITEM_SELECTED } from './constants';

export const DashboardsCard: OnboardingCardComponent = ({
  isCardComplete,
  setComplete,
  setExpandedCardId,
}) => {
  const { spaceId } = useOnboardingContext();
  const [toggleIdSelected, setStoredSelectedDashboardsCardItemId] = useStoredSelectedCardItemId(
    'dashboards',
    spaceId,
    DEFAULT_DASHBOARDS_CARD_ITEM_SELECTED.id
  );
  const [selectedCardItem, setSelectedCardItem] = useState(
    DASHBOARDS_CARD_ITEMS_BY_ID[toggleIdSelected]
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
      setSelectedCardItem(DASHBOARDS_CARD_ITEMS_BY_ID[item.id]);
      setStoredSelectedDashboardsCardItemId(item.id);
    },
    [setStoredSelectedDashboardsCardItemId]
  );

  return (
    <OnboardingCardContentAssetPanel asset={selectedCardItem.asset}>
      <EuiFlexGroup
        direction="column"
        gutterSize="xl"
        justifyContent="flexStart"
        alignItems="flexStart"
      >
        <EuiFlexItem grow={false}>
          <EuiText data-test-subj="dashboardsDescription" size="s">
            {i18n.DASHBOARDS_CARD_DESCRIPTION}
          </EuiText>
          <EuiSpacer />
          <CardSelectorList
            items={DASHBOARDS_CARD_ITEMS}
            onSelect={onSelectCard}
            selectedItem={selectedCardItem}
          />
          {!isIntegrationsCardComplete && (
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
            isDisabled={!isIntegrationsCardComplete}
          >
            {i18n.DASHBOARDS_CARD_GO_TO_DASHBOARDS_BUTTON}
          </CardLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentAssetPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardsCard;
