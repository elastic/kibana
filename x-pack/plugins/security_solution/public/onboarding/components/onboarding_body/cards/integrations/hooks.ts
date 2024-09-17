/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

export type VirtualCard = {
  type: 'virtual';
} & IntegrationCardItem;

export interface FeaturedCard {
  type: 'featured';
  name: string;
}

export type CustomCard = FeaturedCard | VirtualCard;

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
  customCards: string[],
  featuredCards: Record<string, IntegrationCardItem | undefined>
) {
  return customCards.reduce((acc: IntegrationCardItem[], cardName) => {
    if (featuredCards[cardName] != null) {
      acc.push(featuredCards[cardName]);
    }
    return acc;
  }, []);
}

function useFilteredCards(integrationsList: IntegrationCardItem[], customCards?: string[]) {
  return useMemo(() => {
    if (!customCards) {
      return { featuredCards: {}, integrationCards: integrationsList };
    }

    return {
      featuredCards: extractFeaturedCards(integrationsList, customCards),
      integrationCards: integrationsList,
    };
  }, [integrationsList, customCards]);
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
  customCards?: string[]
): IntegrationCardItem[] {
  const { featuredCards, integrationCards } = useFilteredCards(integrationsList, customCards);

  if (customCards && customCards.length > 0) {
    return formatCustomCards(customCards, featuredCards);
  }
  return integrationCards ?? [];
}
