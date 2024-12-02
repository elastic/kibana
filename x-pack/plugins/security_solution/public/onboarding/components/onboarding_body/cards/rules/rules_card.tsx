/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentAssetPanel } from '../common/card_content_asset_panel';
import { CardCallOut } from '../common/card_callout';

import { CardSubduedText } from '../common/card_subdued_text';
import * as i18n from './translations';
import type { CardSelectorListItem } from '../common/card_selector_list';
import { CardSelectorList } from '../common/card_selector_list';
import { useOnboardingContext } from '../../../onboarding_context';
import { RULES_CARD_ITEMS_BY_ID, RULES_CARD_ITEMS } from './rules_card_config';
import { DEFAULT_RULES_CARD_ITEM_SELECTED } from './constants';
import type { CardSelectorAssetListItem } from '../types';
import { useStoredSelectedCardItemId } from '../../../hooks/use_stored_state';

export const RulesCard: OnboardingCardComponent = ({ isCardComplete, setExpandedCardId }) => {
  const { spaceId } = useOnboardingContext();

  const [toggleIdSelected, setStoredSelectedRulesCardItemId] = useStoredSelectedCardItemId(
    'rules',
    spaceId,
    DEFAULT_RULES_CARD_ITEM_SELECTED.id
  );
  const [selectedCardItem, setSelectedCardItem] = useState<CardSelectorAssetListItem>(
    RULES_CARD_ITEMS_BY_ID[toggleIdSelected]
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
      setSelectedCardItem(RULES_CARD_ITEMS_BY_ID[item.id]);
      setStoredSelectedRulesCardItemId(item.id);
    },
    [setStoredSelectedRulesCardItemId]
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
          <CardSubduedText data-test-subj="rulesCardDescription" size="s">
            {i18n.RULES_CARD_DESCRIPTION}
          </CardSubduedText>
          <EuiSpacer />
          <CardSelectorList
            title={i18n.RULES_CARD_STEP_SELECTOR_TITLE}
            items={RULES_CARD_ITEMS}
            onSelect={onSelectCard}
            selectedItem={selectedCardItem}
          />

          {!isIntegrationsCardComplete && (
            <>
              <EuiSpacer size="m" />
              <CardCallOut
                color="primary"
                icon="iInCircle"
                text={i18n.RULES_CARD_CALLOUT_INTEGRATIONS_TEXT}
                action={
                  <EuiLink onClick={expandIntegrationsCard}>
                    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                      <EuiFlexItem>{i18n.RULES_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
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
        <EuiFlexItem data-test-subj="rulesCardButton" grow={false}>
          <SecuritySolutionLinkButton
            deepLinkId={SecurityPageName.rules}
            fill
            isDisabled={!isIntegrationsCardComplete}
          >
            {i18n.RULES_CARD_ADD_RULES_BUTTON}
          </SecuritySolutionLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentAssetPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default RulesCard;
