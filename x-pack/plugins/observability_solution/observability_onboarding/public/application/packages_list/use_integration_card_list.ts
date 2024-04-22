/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { CustomCard } from './types';
import { toCustomCard } from './utils';

function extractFeaturedCards(filteredCards: IntegrationCardItem[], featuredCardNames?: string[]) {
  const featuredCards: Record<string, IntegrationCardItem | undefined> = {};
  filteredCards.forEach((card) => {
    if (featuredCardNames?.includes(card.name)) {
      featuredCards[card.name] = card;
    }
  });
  return featuredCards;
}

function formatCustomCards(
  customCards: CustomCard[],
  featuredCards: Record<string, IntegrationCardItem | undefined>
) {
  const cards: IntegrationCardItem[] = [];
  for (const card of customCards) {
    if (card.type === 'featured' && !!featuredCards[card.name]) {
      cards.push(toCustomCard(featuredCards[card.name]!));
    } else if (card.type === 'virtual') {
      cards.push(toCustomCard(card));
    }
  }
  return cards;
}

function useFilteredCards(
  integrationsList: IntegrationCardItem[],
  selectedCategory: string,
  customCards?: CustomCard[]
) {
  return useMemo(() => {
    const integrationCards = integrationsList
      .filter((card) => card.categories.includes(selectedCategory))
      .map(toCustomCard);

    if (!customCards) {
      return { featuredCards: {}, integrationCards };
    }

    return {
      featuredCards: extractFeaturedCards(
        integrationsList,
        customCards.filter((c) => c.type === 'featured').map((c) => c.name)
      ),
      integrationCards,
    };
  }, [integrationsList, customCards, selectedCategory]);
}

/**
 * Formats the cards to display on the integration list.
 * @param integrationsList the list of cards from the integrations API.
 * @param selectedCategory the card category to filter by.
 * @param customCards any virtual or featured cards.
 * @param fullList when true all integration cards are included.
 * @returns the list of cards to display.
 */
export function useIntegrationCardList(
  integrationsList: IntegrationCardItem[],
  selectedCategory = 'observability',
  customCards?: CustomCard[],
  fullList = false
): IntegrationCardItem[] {
  const { featuredCards, integrationCards } = useFilteredCards(
    integrationsList,
    selectedCategory,
    customCards
  );

  if (customCards && customCards.length > 0) {
    const formattedCustomCards = formatCustomCards(customCards, featuredCards);
    if (fullList) {
      return [...formattedCustomCards, ...integrationCards] as IntegrationCardItem[];
    }
    return formattedCustomCards;
  }
  return integrationCards;
}
