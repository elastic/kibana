/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { FleetSetup, FleetStart, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { useKibana, useNavigation } from '../../../../../common/lib/kibana';
import {
  APP_INTEGRATIONS_PATH,
  APP_UI_ID,
  ONBOARDING_PATH,
} from '../../../../../../common/constants';
import {
  CARD_DESCRIPTION_LINE_CLAMP,
  CARD_TITLE_LINE_CLAMP,
  INTEGRATION_APP_ID,
  MAX_CARD_HEIGHT_IN_PX,
  ONBOARDING_APP_ID,
  ONBOARDING_LINK,
  TELEMETRY_INTEGRATION_CARD,
} from './constants';
import type { GetAppUrl, NavigateTo } from '../../../../../common/lib/kibana';
import { trackOnboardingLinkClick } from '../../../../common/lib/telemetry';
import { useOnboardingContext } from '../../../onboarding_context';

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
  fleet,
  application,
}: {
  featuredCardIds?: string[];
  getAppUrl: GetAppUrl;
  installedIntegrationList?: IntegrationCardItem[];
  integrationsList: IntegrationCardItem[];
  navigateTo: NavigateTo;
  onCardClicked?: () => void;
  fleet: FleetSetup | undefined;
}) => {
  const securityIntegrationsList = integrationsList.map((card) =>
    addSecuritySpecificProps({
      navigateTo,
      getAppUrl,
      card,
      installedIntegrationList,
      onCardClicked,
      fleet,
      application,
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
  fleet,
  application,
}: {
  navigateTo: NavigateTo;
  getAppUrl: GetAppUrl;
  card: IntegrationCardItem;
  installedIntegrationList?: IntegrationCardItem[];
  onCardClicked?: () => void;
  fleet: FleetStart | undefined;
}): IntegrationCardItem => {
  const onboardingLink = getAppUrl({ appId: SECURITY_UI_APP_ID, path: ONBOARDING_PATH });
  const integrationRootUrl = getAppUrl({ appId: INTEGRATION_APP_ID });

  const url =
    card.url.indexOf(APP_INTEGRATIONS_PATH) >= 0 && onboardingLink
      ? addPathParamToUrl(card.url, onboardingLink)
      : card.url;

  const state = {
    onCancelNavigateTo: [APP_UI_ID, { path: ONBOARDING_PATH }],
    onCancelUrl: onboardingLink,
    onSaveNavigateTo: [APP_UI_ID, { path: ONBOARDING_PATH }],
    pkgkey: card.pkgkey,
    panel: 'overview',
    fleet: { auth: fleet?.authz, config: fleet?.config },
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
        onCardClicked?.();

        navigateTo({
          path: `${addPathParamToUrl(ONBOARDING_PATH, onboardingLink)}#integrations`,
          state,
        });

        // navigateTo({
        //   appId: INTEGRATION_APP_ID,
        //   path: url.slice(integrationRootUrl.length),
        //   state,
        // });
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
  onCardClicked?: () => void;
}): IntegrationCardItem[] => {
  const { navigateTo, getAppUrl } = useNavigation();
  // const { fleet } = useOnboardingContext();
  const {
    services: { application, fleet },
  } = useKibana();
  const { featuredCards, integrationCards } = useMemo(
    () =>
      getFilteredCards({
        navigateTo,
        getAppUrl,
        integrationsList,
        featuredCardIds,
        onCardClicked,
        fleet,
        application,
      }),
    [navigateTo, getAppUrl, integrationsList, featuredCardIds, onCardClicked, fleet, application]
  );

  if (featuredCardIds && featuredCardIds.length > 0) {
    return featuredCards;
  }
  return integrationCards ?? [];
};
