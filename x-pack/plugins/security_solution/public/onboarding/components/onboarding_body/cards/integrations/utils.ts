/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';

import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import {
  APP_INTEGRATIONS_PATH,
  APP_UI_ID,
  ONBOARDING_PATH,
} from '../../../../../../common/constants';
import {
  CARD_DESCRIPTION_LINE_CLAMP,
  CARD_TITLE_LINE_CLAMP,
  INTEGRATION_APP_ID,
  MAX_CARD_HEIGHT,
  ONBOARDING_APP_ID,
  ONBOARDING_LINK,
} from './const';
import type { GetAppUrl, NavigateTo } from '../../../../../common/lib/kibana';

export const PackageList = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

export const fetchAvailablePackagesHook = (): Promise<AvailablePackagesHookType> =>
  import('@kbn/fleet-plugin/public')
    .then((module) => module.AvailablePackagesHook())
    .then((hook) => hook.useAvailablePackages);

export const extractFeaturedCards = (
  filteredCards: IntegrationCardItem[],
  featuredCardNames?: string[]
) => {
  return filteredCards.reduce((acc: Record<string, IntegrationCardItem>, card) => {
    if (featuredCardNames?.includes(card.name)) {
      acc[card.name] = card;
    }
    return acc;
  }, {});
};

export const getFilteredCards = ({
  customCardNames,
  getAppUrl,
  installedIntegrationList,
  integrationsList,
  navigateTo,
}: {
  customCardNames?: string[];
  getAppUrl: GetAppUrl;
  installedIntegrationList?: IntegrationCardItem[];
  integrationsList: IntegrationCardItem[];
  navigateTo: NavigateTo;
}) => {
  const securityIntegrationsList = integrationsList.map((card) =>
    addSecuritySpecificProps({ navigateTo, getAppUrl, card, installedIntegrationList })
  );
  if (!customCardNames) {
    return { featuredCards: {}, integrationCards: securityIntegrationsList };
  }

  return {
    featuredCards: extractFeaturedCards(securityIntegrationsList, customCardNames),
    integrationCards: securityIntegrationsList,
  };
};

const addPathParamToUrl = (url: string, onboardingLink: string) => {
  const encoded = encodeURIComponent(onboardingLink);
  const paramsString = `${ONBOARDING_LINK}=${encoded}&${ONBOARDING_APP_ID}=${APP_UI_ID}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
};

const addSecuritySpecificProps = ({
  navigateTo,
  getAppUrl,
  card,
}: {
  navigateTo: NavigateTo;
  getAppUrl: GetAppUrl;
  card: IntegrationCardItem;
  installedIntegrationList?: IntegrationCardItem[];
}): IntegrationCardItem => {
  const onboardingLink = getAppUrl({ appId: SECURITY_UI_APP_ID, path: ONBOARDING_PATH });
  const integrationRootUrl = getAppUrl({ appId: INTEGRATION_APP_ID });
  const state = {
    onCancelNavigateTo: [APP_UI_ID, { path: ONBOARDING_PATH }],
    onCancelUrl: onboardingLink,
    onSaveNavigateTo: [APP_UI_ID, { path: ONBOARDING_PATH }],
  };
  const url =
    card.url.indexOf(APP_INTEGRATIONS_PATH) >= 0 && onboardingLink
      ? addPathParamToUrl(card.url, onboardingLink)
      : card.url;
  return {
    ...card,
    titleLineClamp: CARD_TITLE_LINE_CLAMP,
    descriptionLineClamp: CARD_DESCRIPTION_LINE_CLAMP,
    maxCardHeight: MAX_CARD_HEIGHT,
    showInstallationStatus: true,
    url,
    onCardClick: () => {
      navigateTo({
        appId: INTEGRATION_APP_ID,
        path: url.slice(integrationRootUrl.length),
        state,
      });
    },
  };
};
