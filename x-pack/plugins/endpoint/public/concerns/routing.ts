/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionCreatorFactory } from '../lib/action_creator';
/**
 * `first` and `second` are URL objects https://developer.mozilla.org/en-US/docs/Web/API/URL
 */
export function urlsAreForSamePage(first: URL, second: URL) {
  return (
    pathnameWithSlash(first) === pathnameWithSlash(second) &&
    searchParamsAreEquivalent(first.searchParams, second.searchParams)
  );
}

/**
 * Returns `true` if the `possibleVariation` is the same page, but w/ a search query added
 */
export function urlIsVariationOfUrl(base: URL, possibleVariation: URL) {
  return (
    base.pathname === possibleVariation.pathname &&
    base.search === '' &&
    possibleVariation.search !== ''
  );
}

/**
 * Returns `true` if the route defined by `path` matches the href (string)
 */
export function hrefIsForPath(href: string, path: string) {
  const currentUrl = new URL(href);
  const urlToMatch = new URL(path, new URL(currentUrl.origin));
  return urlIsVariationOfUrl(urlToMatch, currentUrl) || urlsAreForSamePage(urlToMatch, currentUrl);
}

/*
 * Takes in a URL object, returns its pathname ending in slash
 *
 * Commonly used before comparing two urls so that '/endpoints/' can strict equal '/endpoints'
 */
function pathnameWithSlash(url: URL) {
  if (url.pathname.slice(-1) === '/') {
    return url.pathname;
  } else {
    return url.pathname + '/';
  }
}

/**
 * `first` and `second` are URLSearchParams objects https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
 */
function searchParamsAreEquivalent(first: URLSearchParams, second: URLSearchParams) {
  // A Set of keys from the second value which haven't yet been matched w/ an equivalent key from the first
  // @ts-ignore
  const unmatchedKeysFromSecond = new Set(second.keys());

  // @ts-ignore
  for (const key of first.keys()) {
    if (
      second.has(key) === false ||
      setsAreEqual(
        /**
         * `getAll` returns all values for the key
         * we treat ?key=true&key=false the same as ?key=false&key=true
         */
        new Set(first.getAll(key)),
        new Set(second.getAll(key))
      ) === false
    ) {
      return false;
    } else {
      // March this key as matched
      unmatchedKeysFromSecond.delete(key);
    }
  }

  // If there are any unmatched keys, the second value had keys that the first did not
  return unmatchedKeysFromSecond.size === 0;
}

function setsAreEqual(first: Set<string>, second: Set<string>) {
  if (first.size !== second.size) {
    return false;
  }
  for (const value of first) {
    if (second.has(value) === false) {
      return false;
    }
  }

  return true;
}

export const userNavigated = actionCreatorFactory<'userNavigated', [string]>('userNavigated');

export function urlWithoutValueForKey(key: string, valueToDelete: string) {
  const url = new URL(window.location.href);
  const values = url.searchParams.getAll(key);
  url.searchParams.delete(key);
  for (const value of values) {
    if (value !== valueToDelete) {
      url.searchParams.append(key, value);
    }
  }
  return url;
}
