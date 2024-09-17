/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { isEmpty } from 'lodash';
import {
  APP_INTEGRATIONS_PATH,
  APP_PATH,
  ONBOARDING_PATH,
} from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';

export interface CustomCard {
  type: 'featured';
  name: string;
}

function extractFeaturedCards(filteredCards: IntegrationCardItem[], featuredCardNames?: string[]) {
  return filteredCards.reduce((acc: Record<string, IntegrationCardItem>, card) => {
    if (featuredCardNames?.includes(card.name)) {
      acc[card.name] = card;
    }
    return acc;
  }, {});
}

function getFilteredCards(
  integrationsList: IntegrationCardItem[],
  customCards?: string[],
  basePath?: string,
  installedIntegrationList?: IntegrationCardItem[]
) {
  const securityIntegrationsList = integrationsList.map((card) =>
    addSecuritySpecificProps({ card, basePath, installedIntegrationList })
  );
  if (!customCards) {
    return { featuredCards: {}, integrationCards: securityIntegrationsList };
  }

  return {
    featuredCards: extractFeaturedCards(securityIntegrationsList, customCards),
    integrationCards: securityIntegrationsList,
  };
}

function addPathParamToUrl(url: string, onboardingLink: string) {
  const encoded = encodeURIComponent(onboardingLink);
  if (url.indexOf('?') >= 0) {
    return `${url}&onboardingLink=${encoded}`;
  }
  return `${url}?onboardingLink=${encoded}`;
}

function getOnboardingPath(basePath?: string): string | null {
  const onboardingPath = `${APP_PATH}${ONBOARDING_PATH}`;
  const path = !isEmpty(basePath) ? `${basePath}/${onboardingPath}` : onboardingPath;

  return path;
}

function addSecuritySpecificProps({
  basePath,
  card,
  installedIntegrationList,
}: {
  basePath?: string;
  card: IntegrationCardItem;
  installedIntegrationList?: IntegrationCardItem[];
}): IntegrationCardItem {
  const onboardingLink = getOnboardingPath(basePath);
  return {
    ...card,
    showInstallationStatus: true,
    url:
      card.url.indexOf(APP_INTEGRATIONS_PATH) >= 0 && onboardingLink
        ? addPathParamToUrl(card.url, onboardingLink)
        : card.url,
  };
}

export function useIntegrationCardList({
  integrationsList,
  customCards,
}: {
  integrationsList: IntegrationCardItem[];
  customCards?: string[];
}): IntegrationCardItem[] {
  const kibana = useKibana();
  const basePath = kibana.services.http?.basePath.get();
  const { featuredCards, integrationCards } = useMemo(
    () => getFilteredCards(integrationsList, customCards, basePath),
    [integrationsList, customCards, basePath]
  );

  if (customCards && customCards.length > 0) {
    return Object.values(featuredCards) ?? [];
  }
  return integrationCards ?? [];
}
