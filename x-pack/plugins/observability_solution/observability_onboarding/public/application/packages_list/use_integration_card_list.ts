/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CustomCard } from './types';
import { EXPERIMENTAL_ONBOARDING_APP_ROUTE } from '../../common';
import { toCustomCard } from './utils';

export function toOnboardingPath({
  basePath,
  category,
  search,
}: {
  basePath?: string;
  category?: string | null;
  search?: string;
}): string | null {
  if (typeof basePath !== 'string' && !basePath) return null;
  const path = `${basePath}${EXPERIMENTAL_ONBOARDING_APP_ROUTE}`;
  if (!category && !search) return path;
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  return `${path}?${params.toString()}`;
}

export function addPathParamToUrl(url: string, onboardingLink: string) {
  const encoded = encodeURIComponent(onboardingLink);
  if (url.indexOf('?') >= 0) {
    return `${url}&observabilityOnboardingLink=${encoded}`;
  }
  return `${url}?observabilityOnboardingLink=${encoded}`;
}

function useCardUrlRewrite(props: { category?: string | null; search?: string }) {
  const kibana = useKibana();
  const basePath = kibana.services.http?.basePath.get();
  const onboardingLink = useMemo(() => toOnboardingPath({ basePath, ...props }), [basePath, props]);
  return (card: IntegrationCardItem) => ({
    ...card,
    url:
      card.url.indexOf('/app/integrations') >= 0 && onboardingLink
        ? addPathParamToUrl(card.url, onboardingLink)
        : card.url,
  });
}

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
  rewriteUrl: (card: IntegrationCardItem) => IntegrationCardItem,
  customCards: CustomCard[],
  featuredCards: Record<string, IntegrationCardItem | undefined>
) {
  const cards: IntegrationCardItem[] = [];
  for (const card of customCards) {
    if (card.type === 'featured' && !!featuredCards[card.name]) {
      cards.push(toCustomCard(rewriteUrl(featuredCards[card.name]!)));
    } else if (card.type === 'virtual') {
      cards.push(toCustomCard(rewriteUrl(card)));
    }
  }
  return cards;
}

function useFilteredCards(
  rewriteUrl: (card: IntegrationCardItem) => IntegrationCardItem,
  integrationsList: IntegrationCardItem[],
  selectedCategory: string,
  customCards?: CustomCard[]
) {
  return useMemo(() => {
    const integrationCards = integrationsList
      .filter((card) => card.categories.includes(selectedCategory))
      .map(rewriteUrl)
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
  }, [integrationsList, customCards, selectedCategory, rewriteUrl]);
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
  flowCategory?: string | null,
  flowSearch?: string,
  fullList = false
): IntegrationCardItem[] {
  const rewriteUrl = useCardUrlRewrite({ category: flowCategory, search: flowSearch });
  const { featuredCards, integrationCards } = useFilteredCards(
    rewriteUrl,
    integrationsList,
    selectedCategory,
    customCards
  );

  if (customCards && customCards.length > 0) {
    const formattedCustomCards = formatCustomCards(rewriteUrl, customCards, featuredCards);
    if (fullList) {
      return [...formattedCustomCards, ...integrationCards] as IntegrationCardItem[];
    }
    return formattedCustomCards;
  }
  return integrationCards;
}
