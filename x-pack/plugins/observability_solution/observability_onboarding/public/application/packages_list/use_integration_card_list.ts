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

const QUICKSTART_FLOWS = ['kubernetes', 'nginx', 'system-logs-generated'];

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

function useCustomCard(props: { category?: string | null; search?: string }) {
  const kibana = useKibana();
  const basePath = kibana.services.http?.basePath.get();
  const onboardingLink = useMemo(() => toOnboardingPath({ basePath, ...props }), [basePath, props]);
  return (card: IntegrationCardItem) => ({
    ...card,
    url:
      card.url.indexOf('/app/integrations') >= 0 && onboardingLink
        ? addPathParamToUrl(card.url, onboardingLink)
        : card.url,
    isQuickstart: QUICKSTART_FLOWS.includes(card.name),
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

export function useIntegrationCardList(
  filteredCards: IntegrationCardItem[],
  selectedCategory = 'observability',
  customCards?: CustomCard[],
  flowCategory?: string | null,
  flowSearch?: string
): IntegrationCardItem[] {
  const featuredCards = useMemo(() => {
    if (!customCards) return {};
    return extractFeaturedCards(
      filteredCards,
      customCards.filter((c) => c.type === 'featured').map((c) => c.name)
    );
  }, [filteredCards, customCards]);
  const toCustomCard = useCustomCard({ category: flowCategory, search: flowSearch });

  if (customCards && customCards.length > 0) {
    return customCards
      .map((c) => {
        if (c.type === 'featured') {
          return !!featuredCards[c.name] ? toCustomCard(featuredCards[c.name]!) : null;
        }
        return toCustomCard(c);
      })
      .filter((c) => c) as IntegrationCardItem[];
  }
  return filteredCards
    .filter((card) => card.categories.includes(selectedCategory))
    .map(toCustomCard);
}
