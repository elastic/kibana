/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CenteredLoadingSpinner } from '../../../common/components/centered_loading_spinner';
import type { OnboardingCardId } from '../../constants';
import { useBodyConfig } from './hooks/use_body_config';
import { OnboardingCardGroup } from './onboarding_card_group';
import { OnboardingCardPanel } from './onboarding_card_panel';
import { useExpandedCard } from './hooks/use_expanded_card';
import { useCompletedCards } from './hooks/use_completed_cards';
import type { IsCardAvailable } from '../../types';

export const OnboardingBody = React.memo(() => {
  const bodyConfig = useBodyConfig();

  const { expandedCardId, setExpandedCardId } = useExpandedCard();
  const { isCardComplete, setCardComplete, getCardCheckCompleteResult, checkCardComplete } =
    useCompletedCards(bodyConfig);

  const createOnToggleExpanded = useCallback(
    (cardId: OnboardingCardId) => () => {
      if (expandedCardId === cardId) {
        setExpandedCardId(null);
      } else {
        setExpandedCardId(cardId);
        checkCardComplete(cardId);
      }
    },
    [expandedCardId, setExpandedCardId, checkCardComplete]
  );

  const createSetCardComplete = useCallback(
    (cardId: OnboardingCardId) => (complete: boolean) => {
      setCardComplete(cardId, complete);
    },
    [setCardComplete]
  );

  const createCheckCardComplete = useCallback(
    (cardId: OnboardingCardId) => () => {
      checkCardComplete(cardId);
    },
    [checkCardComplete]
  );

  const isCardAvailable = useCallback<IsCardAvailable>(
    (cardId: OnboardingCardId) =>
      bodyConfig.some((group) => group.cards.some((card) => card.id === cardId)),
    [bodyConfig]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="xl">
      {bodyConfig.map((group, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiSpacer size="xxl" />
          <OnboardingCardGroup title={group.title}>
            <EuiFlexGroup direction="column" gutterSize="m">
              {group.cards.map(({ id, title, icon, Component: LazyCardComponent }) => {
                const cardCheckCompleteResult = getCardCheckCompleteResult(id);
                return (
                  <EuiFlexItem key={id} grow={false}>
                    <OnboardingCardPanel
                      id={id}
                      title={title}
                      icon={icon}
                      checkCompleteResult={cardCheckCompleteResult}
                      isExpanded={expandedCardId === id}
                      isComplete={isCardComplete(id)}
                      onToggleExpanded={createOnToggleExpanded(id)}
                    >
                      <Suspense fallback={<CenteredLoadingSpinner size="m" />}>
                        <LazyCardComponent
                          setComplete={createSetCardComplete(id)}
                          checkComplete={createCheckCardComplete(id)}
                          isCardComplete={isCardComplete}
                          isCardAvailable={isCardAvailable}
                          setExpandedCardId={setExpandedCardId}
                          checkCompleteMetadata={cardCheckCompleteResult?.metadata}
                        />
                      </Suspense>
                    </OnboardingCardPanel>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </OnboardingCardGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});

OnboardingBody.displayName = 'OnboardingBody';
