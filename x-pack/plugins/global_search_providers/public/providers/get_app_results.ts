/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import levenshtein from 'js-levenshtein';
import { PublicAppInfo, PublicLegacyAppInfo } from 'src/core/public';
import { GlobalSearchProviderResult } from '../../../global_search/public';

export const getAppResults = (
  term: string,
  apps: Array<PublicAppInfo | PublicLegacyAppInfo>
): GlobalSearchProviderResult[] => {
  return apps
    .map((app) => ({ app, score: scoreApp(term, app) }))
    .filter(({ score }) => score > 0)
    .map(({ app, score }) => appToResult(app, score));
};

export const scoreApp = (term: string, { title }: PublicAppInfo | PublicLegacyAppInfo): number => {
  term = term.toLowerCase();
  title = title.toLowerCase();

  // shortcuts to avoid calculating the distance when there is an exact match somewhere.
  if (title === term) {
    return 100;
  }
  if (title.startsWith(term)) {
    return 90;
  }
  if (title.includes(term)) {
    return 75;
  }
  const length = Math.max(term.length, title.length);
  const distance = levenshtein(term, title);

  // maximum lev distance is length, we compute the match ratio (lower distance is better)
  const ratio = Math.floor((1 - distance / length) * 100);
  if (ratio >= 60) {
    return ratio;
  }
  return 0;
};

export const appToResult = (
  app: PublicAppInfo | PublicLegacyAppInfo,
  score: number
): GlobalSearchProviderResult => {
  return {
    id: app.id,
    title: app.title,
    type: 'application',
    icon: app.euiIconType,
    url: app.legacy ? app.appUrl : app.appRoute,
    score,
  };
};
