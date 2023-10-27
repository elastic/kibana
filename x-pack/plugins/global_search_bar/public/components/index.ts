/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalSearchResult } from '@kbn/global-search-plugin/public';

/* @internal */
export const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

/* @internal */
export const blurEvent = new FocusEvent('focusout', {
  bubbles: true,
});

const sortByScore = (a: GlobalSearchResult, b: GlobalSearchResult): number => {
  if (a.score < b.score) return 1;
  if (a.score > b.score) return -1;
  return 0;
};

const sortByTitle = (a: GlobalSearchResult, b: GlobalSearchResult): number => {
  const titleA = a.title.toUpperCase(); // ignore upper and lowercase
  const titleB = b.title.toUpperCase(); // ignore upper and lowercase
  if (titleA < titleB) return -1;
  if (titleA > titleB) return 1;
  return 0;
};

/* @internal */
export const sort = {
  byScore: sortByScore,
  byTitle: sortByTitle,
};
