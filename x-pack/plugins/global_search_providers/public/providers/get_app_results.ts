/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import levenshtein from 'js-levenshtein';
import { PublicAppInfo, PublicAppSearchDeepLinkInfo, PublicAppMetaInfo } from 'src/core/public';
import { GlobalSearchProviderResult } from '../../../global_search/public';

/** Type used internally to represent an application unrolled into its separate searchDeepLinks */
export interface AppLink {
  id: string;
  app: PublicAppInfo;
  subLinkTitles: string[];
  path: string;
  meta: PublicAppMetaInfo;
  subLinkKeywords: string[];
}

export const getAppResults = (
  term: string,
  apps: PublicAppInfo[]
): GlobalSearchProviderResult[] => {
  return (
    apps
      // Unroll all searchDeepLinks, only if there is a search term
      .flatMap((app) =>
        term.length > 0
          ? flattenDeepLinks(app)
          : [
              {
                id: app.id,
                app,
                path: app.appRoute,
                subLinkTitles: [],
                subLinkKeywords: [],
                meta: app.meta,
              },
            ]
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
  const appKeywords = appLink.app.meta.keywords.map((keyword) => keyword.toLowerCase());
  const appSubLinkKeywords = appLink.subLinkKeywords.map((keyword) => keyword.toLowerCase());
  const keywords = [...appKeywords, ...appSubLinkKeywords];
  const appScoreByKeywords = scoreAppByKeywords(term, keywords);
  return Math.max(appScoreByTerms, appScoreByKeywords);
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

const flattenDeepLinks = (
  app: PublicAppInfo,
  deepLink?: PublicAppSearchDeepLinkInfo
): AppLink[] => {
  if (!deepLink) {
    return [
      {
        id: app.id,
        app,
        path: app.appRoute,
        subLinkTitles: [],
        subLinkKeywords: [],
        meta: {
          keywords: app.meta?.keywords || [],
        },
      },
      ...app.searchDeepLinks.flatMap((appDeepLink) => flattenDeepLinks(app, appDeepLink)),
    ];
  }
  return [
    ...(deepLink.path
      ? [
          {
            id: `${app.id}-${deepLink.id}`,
            app,
            subLinkTitles: [deepLink.title],
            subLinkKeywords: [...deepLink.meta.keywords],
            path: `${app.appRoute}${deepLink.path}`,
            meta: { ...deepLink.meta },
          },
        ]
      : []),
    ...deepLink.searchDeepLinks
      .flatMap((deepDeepLink) => flattenDeepLinks(app, deepDeepLink))
      .map((deepAppLink) => ({
        ...deepAppLink,
        // shift current sublink title into array of sub-sublink titles
        subLinkTitles: [deepLink.title, ...deepAppLink.subLinkTitles],
        // combine current sublink keywords into array of sub-link keywords
        subLinkKeywords: deepLink.meta.keywords.concat(deepAppLink.subLinkKeywords),
      })),
  ];
};
