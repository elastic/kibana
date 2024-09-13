/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CenteredLoadingSpinner } from '../../../common/components/centered_loading_spinner';
import type { OnboardingCardId } from '../../constants';
import { useBodyConfig } from './hooks/use_body_config';
import { useOnboardingContext } from '../onboarding_context';
import { OnboardingCardGroup } from './onboarding_card_group';
import { OnboardingCardPanel } from './onboarding_card_panel';
import { useCheckCompleteCards } from './hooks/use_check_complete_cards';
import { useExpandedCard } from './hooks/use_expanded_card';
import { useCompletedCards } from './hooks/use_completed_cards';

export const OnboardingBody = React.memo(() => {
  const { spaceId } = useOnboardingContext();
  const bodyConfig = useBodyConfig();

  const { expandedCardId, setExpandedCardId } = useExpandedCard(spaceId);
  const { isCardComplete, setCardComplete } = useCompletedCards(spaceId);

  const { checkAllCardsComplete, checkCardComplete } = useCheckCompleteCards(
    bodyConfig,
    setCardComplete
  );

  useEffect(() => {
    // initial auto-check for all cards
    checkAllCardsComplete();
  }, [checkAllCardsComplete]);

  const createOnToggleExpanded = useCallback(
    (cardId: OnboardingCardId) => () => {
      if (expandedCardId === cardId) {
        setExpandedCardId(null);
      } else {
        setExpandedCardId(cardId);
        // execute the auto-check for the card when it's been expanded
        checkCardComplete(cardId);
      }
    },
    [setExpandedCardId, expandedCardId, checkCardComplete]
  );

  const createSetCardComplete = useCallback(
    (cardId: OnboardingCardId) => (complete: boolean) => {
      setCardComplete(cardId, complete);
    },
    [setCardComplete]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="xl">
      {bodyConfig.map((group, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiSpacer size="xxl" />
          <OnboardingCardGroup title={group.title}>
            <EuiFlexGroup direction="column" gutterSize="m">
              {group.cards.map(({ id, title, icon, Component: LazyCardComponent }) => (
                <EuiFlexItem key={id} grow={false}>
                  <OnboardingCardPanel
                    id={id}
                    title={title}
                    icon={icon}
                    isExpanded={expandedCardId === id}
                    isComplete={isCardComplete(id)}
                    onToggleExpanded={createOnToggleExpanded(id)}
                  >
                    <Suspense fallback={<CenteredLoadingSpinner size="m" />}>
                      <LazyCardComponent
                        setComplete={createSetCardComplete(id)}
                        isCardComplete={isCardComplete}
                        setExpandedCardId={setExpandedCardId}
                      />
                    </Suspense>
                  </OnboardingCardPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </OnboardingCardGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});

OnboardingBody.displayName = 'OnboardingBody';
