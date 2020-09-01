/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This method is adapted from the `react-router-named-routes` library. The library is
 * 5 years old and has no typings, is written in ES5, and the one method is all that
 * is needed from the library.
 *
 * Source: https://github.com/adamziel/react-router-named-routes/blob/master/lib/index.js
 *
 * Usage:
 * const ROUTE_PATH = '/foo/bar/:id/status'
 * formatRoute(ROUTE_PATH, { id: 2 }) // '/foo/bar/2/status'
 */

interface ParamsObject {
  [key: string]: string | number;
}

// Cached regexps:
const reRepeatingSlashes = /\/+/g; // "/some//path"
const reResolvedOptionalParams = /\(([^:*?#]+?)\)/g; // "/path/with/(resolved/params)"
const reUnresolvedOptionalParams = /\([^:?#]*:[^?#]*?\)/g; // "/path/with/(groups/containing/:unresolved/optional/:params)"
const reTokens = /<(.*?)>/g;

export const formatRoute = (routePath: string, params: ParamsObject) => {
  const tokens = {} as { [key: string]: string };

  for (const paramName in params) {
    if (params.hasOwnProperty(paramName)) {
      const paramValue = params[paramName].toString();
      const paramRegex = new RegExp('(/|\\(|\\)|^):' + paramName + '(/|\\)|\\(|$)');
      routePath = routePath.replace(paramRegex, (_, g1, g2) => {
        tokens[paramName] = encodeURIComponent(paramValue);
        return `${g1}<${paramName}>${g2}`;
      });
    }
  }

  return (
    routePath
      // Remove braces around resolved optional params (i.e. "/path/(value)")
      .replace(reResolvedOptionalParams, '$1')
      // Remove all sequences containing at least one unresolved optional param
      .replace(reUnresolvedOptionalParams, '')
      // Remove all sequences containing at least one unresolved optional param in RR4
      .replace(reTokens, (_, token) => tokens[token])
      // Remove repeating slashes
      .replace(reRepeatingSlashes, '/')
      // Always remove ending slash for consistency
      .replace(/\/+$/, '')
      // If there was a single slash only, keep it
      .replace(/^$/, '/')
  );
};
