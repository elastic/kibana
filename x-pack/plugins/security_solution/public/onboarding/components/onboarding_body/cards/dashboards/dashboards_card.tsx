/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useStoredSelectedDashboardsCardItemId } from '../../../../hooks/use_stored_state';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { CardCallOut } from '../common/card_callout';
import { CardLinkButton } from '../common/card_link_button';
import * as i18n from './translations';
import type { CardSelectorListItem } from '../common/card_selector_list';
import { CardSelectorList } from '../common/card_selector_list';
import { DASHBOARDS_CARD_ITEMS, DASHBOARDS_CARD_ITEMS_BY_ID } from './dashboards_card_config';
import { DEFAULT_DASHBOARDS_CARD_ITEM_SELECTED } from './constants';
import { useOnboardingContext } from '../../../onboarding_context';

export const DashboardsCard: OnboardingCardComponent = ({
  isCardComplete,
  setComplete,
  setExpandedCardId,
}) => {
  const { spaceId } = useOnboardingContext();
  const [toggleIdSelected, setSelectedRulesCardItemIdToStorage] =
    useStoredSelectedDashboardsCardItemId(spaceId, DEFAULT_DASHBOARDS_CARD_ITEM_SELECTED.id);
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
      setSelectedCardItem(item);
      setSelectedRulesCardItemIdToStorage(item.id);
    },
    [setSelectedRulesCardItemIdToStorage]
  );

  return (
    <OnboardingCardContentImagePanel media={selectedCardItem.asset}>
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
    </OnboardingCardContentImagePanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardsCard;
