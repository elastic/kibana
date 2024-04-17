/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { CustomCard } from './types';

const QUICKSTART_FLOWS = ['system-logs-generated', 'custom-logs-generated'];

const toCustomCard = (card: IntegrationCardItem) => ({
  ...card,
  isQuickstart: QUICKSTART_FLOWS.includes(card.name),
});

function extractFeaturedCards(
  filteredCards: IntegrationCardItem[],
  featuredCardNames?: string[]
) {
  const featuredCards: Record<string, IntegrationCardItem | undefined> = {};
  filteredCards.forEach((card) => {
    if (featuredCardNames?.includes(card.name)) {
      featuredCards[card.name] = card;
    }
  });
  return featuredCards;
}

export function useIntegrationCardList(
  filteredCards: IntegrationCardItem[],
  selectedCategory = 'observability',
  customCards?: CustomCard[]
): IntegrationCardItem[] {
  const featuredCards = useMemo(() => {
    if (!customCards) return {};
    return extractFeaturedCards(
      filteredCards,
      customCards.filter((c) => c.type === 'featured').map((c) => c.name)
    );
  }, [filteredCards, customCards]);

  if (customCards && customCards.length > 0) {
    return customCards
      .map((c) => {
        if (c.type === 'featured') {
          return !!featuredCards[c.name]
            ? toCustomCard(featuredCards[c.name]!)
            : null;
        }
        return toCustomCard(c);
      })
      .filter((c) => c) as IntegrationCardItem[];
  }
  return filteredCards
    .filter((card) => card.categories.includes(selectedCategory))
    .map(toCustomCard);
}
