/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { isEmpty } from 'lodash';

import {
  APP_INTEGRATIONS_PATH,
  APP_PATH,
  APP_UI_ID,
  ONBOARDING_PATH,
} from '../../../../../../common/constants';
import { ONBOARDING_APP_ID, ONBOARDING_LINK } from './const';

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

export const getFilteredCards = (
  integrationsList: IntegrationCardItem[],
  customCards?: string[],
  basePath?: string,
  installedIntegrationList?: IntegrationCardItem[]
) => {
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
};

const addPathParamToUrl = (url: string, onboardingLink: string) => {
  const encoded = encodeURIComponent(onboardingLink);
  const paramsString = `${ONBOARDING_LINK}=${encoded}&${ONBOARDING_APP_ID}=${APP_UI_ID}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
};

const getOnboardingPath = (basePath?: string): string | null => {
  const onboardingPath = `${APP_PATH}${ONBOARDING_PATH}`;
  const path = !isEmpty(basePath) ? `${basePath}/${onboardingPath}` : onboardingPath;

  return path;
};

const addSecuritySpecificProps = ({
  basePath,
  card,
}: {
  basePath?: string;
  card: IntegrationCardItem;
  installedIntegrationList?: IntegrationCardItem[];
}): IntegrationCardItem => {
  const onboardingLink = getOnboardingPath(basePath);
  return {
    ...card,
    titleLineClamp: 1,
    descriptionLineClamp: 3,
    fixedCardHeight: 127,
    showInstallationStatus: true,
    url:
      card.url.indexOf(APP_INTEGRATIONS_PATH) >= 0 && onboardingLink
        ? addPathParamToUrl(card.url, onboardingLink)
        : card.url,
  };
};
