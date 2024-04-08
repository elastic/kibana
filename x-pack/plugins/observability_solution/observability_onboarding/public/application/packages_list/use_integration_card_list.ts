/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { IntegrationCardItem } from '@kbn/fleet-plugin/public';

const QUICKSTART_FLOWS = ['kubernetes'];

const toCustomCard = (card: IntegrationCardItem) => ({
  ...card,
  isQuickstart: QUICKSTART_FLOWS.includes(card.name),
});

function extractFeaturedCards(
  filteredCards: IntegrationCardItem[],
  featuredCardNames?: string[]
) {
  const featuredCards: Record<string, IntegrationCardItem> = {};
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
  featuredCardNames?: string[],
  generatedCards?: IntegrationCardItem[]
): IntegrationCardItem[] {
  const list: IntegrationCardItem[] = [];
  const featuredCards = useMemo(() => {
    if (!featuredCardNames) return {};
    return extractFeaturedCards(filteredCards, featuredCardNames);
  }, [filteredCards, featuredCardNames]);
  if (featuredCardNames || generatedCards) {
    featuredCardNames?.forEach((name) =>
      list.push(toCustomCard(featuredCards[name]))
    );
    generatedCards?.forEach((c) => list.push(toCustomCard(c)));
    return list;
  }
  return filteredCards
    .filter((card) => card.categories.includes(selectedCategory))
    .map(toCustomCard);
}
