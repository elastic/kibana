/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import levenshtein from 'js-levenshtein';
import { PublicAppInfo, PublicAppSubLinkInfo } from 'src/core/public';
import { GlobalSearchProviderResult } from '../../../global_search/public';

/** Type used internally to represent an application unrolled into its separate sublinks */
export interface AppLink {
  id: string;
  app: PublicAppInfo;
  subLinkTitles: string[];
  path: string;
}

export const getAppResults = (
  term: string,
  apps: PublicAppInfo[]
): GlobalSearchProviderResult[] => {
  return (
    apps
      // Unroll all sublinks
      .flatMap((app) => flattenSubLinks(app))
      // Only include sublinks if there is a search term
      .filter((appLink) => term.length > 0 || appLink.subLinkTitles.length === 0)
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

const flattenSubLinks = (app: PublicAppInfo, subLink?: PublicAppSubLinkInfo): AppLink[] => {
  if (!subLink) {
    return [
      {
        id: app.id,
        app,
        path: app.appRoute,
        subLinkTitles: [],
      },
      ...app.subLinks.flatMap((appSubLink) => flattenSubLinks(app, appSubLink)),
    ];
  }

  const appLink: AppLink = {
    id: `${app.id}-${subLink.id}`,
    app,
    subLinkTitles: [subLink.title],
    path: `${app.appRoute}${subLink.path}`,
  };

  return [
    ...(subLink.path ? [appLink] : []),
    ...subLink.subLinks
      .flatMap((subSubLink) => flattenSubLinks(app, subSubLink))
      .map((subAppLink) => ({
        ...subAppLink,
        // shift current sublink title into array of sub-sublink titles
        subLinkTitles: [subLink.title, ...subAppLink.subLinkTitles],
      })),
  ];
};
