/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback } from 'react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { PAGE_CONTENT_WIDTH, type OnboardingHubCardId } from '../../constants';
import { useCardGroupsConfig } from './use_card_groups_config';
import { useOnboardingContext } from '../onboarding_context';
import { useStoredCompletedCardIds, useStoredExpandedCardId } from '../use_stored_state';
import { OnboardingCardGroup } from './onboarding_card_group';
import { OnboardingCardPanel } from './onboarding_card_panel';

export const OnboardingBody = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const { spaceId } = useOnboardingContext();

  const [completeCardIds, setCompleteCardIds] = useStoredCompletedCardIds(spaceId);
  const [expandedCardId, setExpandedCardId] = useStoredExpandedCardId(spaceId);

  const cardGroupsConfig = useCardGroupsConfig();

  const isCardComplete = useCallback(
    (cardId: OnboardingHubCardId) => completeCardIds.includes(cardId),
    [completeCardIds]
  );

  const setCompleteCard = useCallback(
    (stepId: OnboardingHubCardId, complete: boolean) => {
      if (complete) {
        setCompleteCardIds((currentCompleteCards = []) => [
          ...new Set([...currentCompleteCards, stepId]),
        ]);
      } else {
        setCompleteCardIds((currentCompleteCards = []) =>
          currentCompleteCards.filter((id) => id !== stepId)
        );
      }
    },
    [setCompleteCardIds]
  );

  //   const {loading, completedCards, error} = useCheckCompleteCards(groupsConfig);

  const createCardSetComplete = useCallback(
    (cardId: OnboardingHubCardId) => (complete: boolean) => {
      setCompleteCard(cardId, complete);
    },
    [setCompleteCard]
  );

  const createOnToggleExpanded = useCallback(
    (cardId: OnboardingHubCardId) => (expanded: boolean) => {
      setExpandedCardId(expanded ? cardId : null);
    },
    [setExpandedCardId]
  );

  return (
    <KibanaPageTemplate.Section
      bottomBorder="extended"
      grow={true}
      restrictWidth={PAGE_CONTENT_WIDTH}
      paddingSize="xl"
      css={css`
        background-color: ${euiTheme.colors.lightestShade};
      `}
    >
      {cardGroupsConfig.map((group) => {
        return (
          <OnboardingCardGroup key={group.title} title={group.title}>
            {group.cards.map((card) => {
              const LazyCardComponent = card.component;
              const onToggleExpanded = createOnToggleExpanded(card.id);
              return (
                <OnboardingCardPanel
                  key={card.id}
                  id={card.id}
                  title={card.title}
                  icon={card.icon}
                  isExpanded={expandedCardId === card.id}
                  isComplete={isCardComplete(card.id)}
                  onToggleExpanded={onToggleExpanded}
                >
                  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                    <LazyCardComponent setComplete={createCardSetComplete(card.id)} />
                  </Suspense>
                </OnboardingCardPanel>
              );
            })}
          </OnboardingCardGroup>
        );
      })}
    </KibanaPageTemplate.Section>
  );
});

OnboardingBody.displayName = 'OnboardingBody';

/**
 TODO: 
- implement OnboardingCardBody component in separate file
- implement OnboardingCardPanel components in separate files, it should call
- implement useCheckCompleteCards hook to execute only the first render
- if the logic related to completed cards (including useCheckCompleteCards) becomes too big or complex, consider moving it to a custom hook: 
   const { isCardComplete, setCompleteCard } = useCompleteCards(groupsConfig);
- implement header and footer components
(most of the components are already implemented in the original code, so you can copy them and adjust them as needed)
 */
