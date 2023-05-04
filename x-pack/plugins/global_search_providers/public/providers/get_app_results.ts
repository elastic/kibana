/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import levenshtein from 'js-levenshtein';
import { PublicAppInfo, PublicAppDeepLinkInfo } from '@kbn/core/public';
import { GlobalSearchProviderResult } from '@kbn/global-search-plugin/public';

/** Type used internally to represent an application unrolled into its separate deepLinks */
export interface AppLink {
  id: string;
  app: PublicAppInfo;
  subLinkTitles: string[];
  path: string;
  keywords: string[];
}

/** weighting factor for scoring keywords */
export const keywordScoreWeighting = 0.8;

export const getAppResults = (
  term: string,
  apps: PublicAppInfo[]
): GlobalSearchProviderResult[] => {
  return (
    apps
      // Unroll all deepLinks, only if there is a search term
      .flatMap((app) =>
        term.length > 0
          ? flattenDeepLinks(app)
          : app.searchable
          ? [
              {
                id: app.id,
                app,
                path: app.appRoute,
                subLinkTitles: [],
                keywords: app.keywords ?? [],
              },
            ]
          : []
      )
      .map((appLink) => ({
        appLink,
        score: scoreApp(term, appLink),
      }))
      .filter(({ score }) => score > 0)
      .map(({ appLink, score }) => appToResult(appLink, score))
  );
};

export const scoreApp = (term: string, appLink: AppLink): number => {
  term = term.toLowerCase();
  const title = [appLink.app.title, ...appLink.subLinkTitles].join(' ').toLowerCase();
  const appScoreByTerms = scoreAppByTerms(term, title);

  const keywords = [
    ...appLink.app.keywords.map((keyword) => keyword.toLowerCase()),
    ...appLink.keywords.map((keyword) => keyword.toLowerCase()),
  ];
  const appScoreByKeywords = scoreAppByKeywords(term, keywords);

  return Math.max(appScoreByTerms, appScoreByKeywords * keywordScoreWeighting);
};

const scoreAppByTerms = (term: string, title: string): number => {
  if (title === term) {
    // shortcuts to avoid calculating the distance when there is an exact match somewhere.
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

const scoreAppByKeywords = (term: string, keywords: string[]): number => {
  const scores = keywords.map((keyword) => {
    return scoreAppByTerms(term, keyword);
  });
  return Math.max(...scores);
};

export const appToResult = (appLink: AppLink, score: number): GlobalSearchProviderResult => {
  const titleParts =
    // Stack Management app should not include the app title in the concatenated link label
    appLink.app.id === 'management' && appLink.subLinkTitles.length > 0
      ? appLink.subLinkTitles
      : [appLink.app.title, ...appLink.subLinkTitles];

  return {
    id: appLink.id,
    // Concatenate title using slashes
    title: titleParts.join(' / '),
    type: 'application',
    icon: appLink.app.euiIconType,
    url: appLink.path,
    meta: {
      categoryId: appLink.app.category?.id ?? null,
      categoryLabel: appLink.app.category?.label ?? null,
    },
    score,
  };
};

const flattenDeepLinks = (app: PublicAppInfo, deepLink?: PublicAppDeepLinkInfo): AppLink[] => {
  if (!deepLink) {
    return [
      ...(app.searchable
        ? [
            {
              id: app.id,
              app,
              path: app.appRoute,
              subLinkTitles: [],
              keywords: app?.keywords ?? [],
            },
          ]
        : []),
      ...app.deepLinks.flatMap((appDeepLink) => flattenDeepLinks(app, appDeepLink)),
    ];
  }
  return [
    ...(deepLink.path && deepLink.searchable
      ? [
          {
            id: `${app.id}-${deepLink.id}`,
            app,
            path: `${app.appRoute}${deepLink.path}`,
            subLinkTitles: [deepLink.title],
            keywords: [...(deepLink.keywords ?? [])],
          },
        ]
      : []),
    ...deepLink.deepLinks
      .flatMap((deepDeepLink) => flattenDeepLinks(app, deepDeepLink))
      .map((deepAppLink) => ({
        ...deepAppLink,
        // shift current sublink title into array of sub-sublink titles
        subLinkTitles: [deepLink.title, ...deepAppLink.subLinkTitles],
        // combine current sublink keywords into array of sub-link keywords
        keywords: [...deepLink.keywords, ...deepAppLink.keywords],
      })),
  ];
};
