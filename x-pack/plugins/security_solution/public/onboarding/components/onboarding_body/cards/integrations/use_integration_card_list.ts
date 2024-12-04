/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { useNavigation } from '../../../../../common/lib/kibana';
import {
  APP_INTEGRATIONS_PATH,
  APP_UI_ID,
  ONBOARDING_PATH,
} from '../../../../../../common/constants';
import {
  CARD_DESCRIPTION_LINE_CLAMP,
  CARD_TITLE_LINE_CLAMP,
  MAX_CARD_HEIGHT_IN_PX,
  ONBOARDING_APP_ID,
  ONBOARDING_LINK,
  TELEMETRY_INTEGRATION_CARD,
} from './constants';
import type { GetAppUrl, NavigateTo } from '../../../../../common/lib/kibana';
import { trackOnboardingLinkClick } from '../../../lib/telemetry';

const addPathParamToUrl = (url: string, onboardingLink: string) => {
  const encoded = encodeURIComponent(onboardingLink);
  const paramsString = `${ONBOARDING_LINK}=${encoded}&${ONBOARDING_APP_ID}=${APP_UI_ID}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
};

const extractFeaturedCards = (filteredCards: IntegrationCardItem[], featuredCardIds: string[]) => {
  return filteredCards.reduce<IntegrationCardItem[]>((acc, card) => {
    if (featuredCardIds.includes(card.id)) {
      acc.push(card);
    }
    return acc;
  }, []);
};

const getFilteredCards = ({
  featuredCardIds,
  getAppUrl,
  installedIntegrationList,
  integrationsList,
  navigateTo,
  onCardClicked,
}: {
  featuredCardIds?: string[];
  getAppUrl: GetAppUrl;
  installedIntegrationList?: IntegrationCardItem[];
  integrationsList: IntegrationCardItem[];
  navigateTo: NavigateTo;
  onCardClicked?: (integrationName: string) => void;
}) => {
  const securityIntegrationsList = integrationsList.map((card) =>
    addSecuritySpecificProps({
      navigateTo,
      getAppUrl,
      card,
      installedIntegrationList,
      onCardClicked,
    })
  );
  if (!featuredCardIds) {
    return { featuredCards: [], integrationCards: securityIntegrationsList };
  }
  const featuredCards = extractFeaturedCards(securityIntegrationsList, featuredCardIds);
  return {
    featuredCards,
    integrationCards: securityIntegrationsList,
  };
};

const addSecuritySpecificProps = ({
  navigateTo,
  getAppUrl,
  card,
  onCardClicked,
}: {
  navigateTo: NavigateTo;
  getAppUrl: GetAppUrl;
  card: IntegrationCardItem;
  installedIntegrationList?: IntegrationCardItem[];
  onCardClicked?: (integrationName: string) => void;
}): IntegrationCardItem => {
  const onboardingLink = getAppUrl({ appId: SECURITY_UI_APP_ID, path: ONBOARDING_PATH });

  const url =
    card.url.indexOf(APP_INTEGRATIONS_PATH) >= 0 && onboardingLink
      ? addPathParamToUrl(card.url, onboardingLink)
      : card.url;

  const state = {
    onCancelNavigateTo: [
      APP_UI_ID,
      { path: ONBOARDING_PATH, state: { pkgkey: card.pkgkey, onCancelUrl: onboardingLink } },
    ],
    onCancelUrl: onboardingLink,
    onSaveNavigateTo: [APP_UI_ID, { path: ONBOARDING_PATH, state: { pkgkey: card.pkgkey } }],
    pkgkey: card.pkgkey,
    panel: 'overview', // Default to the overview tab on modal opened
  };

  return {
    ...card,
    titleLineClamp: CARD_TITLE_LINE_CLAMP,
    descriptionLineClamp: CARD_DESCRIPTION_LINE_CLAMP,
    maxCardHeight: MAX_CARD_HEIGHT_IN_PX,
    showInstallationStatus: true,
    url,
    onCardClick: () => {
      const trackId = `${TELEMETRY_INTEGRATION_CARD}_${card.id}`;
      trackOnboardingLinkClick(trackId);

      if (url.startsWith(APP_INTEGRATIONS_PATH)) {
        onCardClicked?.(card.name); // fix me: type error

        navigateTo({
          path: `${addPathParamToUrl(ONBOARDING_PATH, onboardingLink)}#integrations`,
          state,
        });
      } else if (url.startsWith('http') || url.startsWith('https')) {
        window.open(url, '_blank');
      } else {
        navigateTo({ url, state });
      }
    },
  };
};

export const useIntegrationCardList = ({
  integrationsList,
  featuredCardIds,
  onCardClicked,
}: {
  integrationsList: IntegrationCardItem[];
  featuredCardIds?: string[] | undefined;
  onCardClicked?: (integrationName: string) => void;
}): IntegrationCardItem[] => {
  const { navigateTo, getAppUrl } = useNavigation();

  const { featuredCards, integrationCards } = useMemo(
    () =>
      getFilteredCards({
        navigateTo,
        getAppUrl,
        integrationsList,
        featuredCardIds,
        onCardClicked,
      }),
    [navigateTo, getAppUrl, integrationsList, featuredCardIds, onCardClicked]
  );

  if (featuredCardIds && featuredCardIds.length > 0) {
    return featuredCards;
  }
  return integrationCards ?? [];
};
