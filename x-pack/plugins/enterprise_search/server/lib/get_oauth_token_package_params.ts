/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTERPRISE_SEARCH_KIBANA_COOKIE } from '../../common/constants';

export function getOAuthTokenPackageParams(cookieHeaders: string | string[] | undefined) {
  // In the future the token package will be stored in the login session. For now it's in a cookie.

  // No cookie headers? No tokens
  if (!cookieHeaders) {
    return {};
  }

  // Take any cookie headers and split the individual cookies out, e.g. "_my_cookie=chocolateChip"
  const cookiePayloads = [cookieHeaders].flat().flatMap((rawHeader) => rawHeader.split('; '));

  // Split those raw cookies into [key, value] pairs, e.g. ["_my_cookie", "chocolateChip"]
  const cookiePairs = cookiePayloads.map((rawCookie) => rawCookie.split('='));

  const tokenPackageCookie = cookiePairs.find((cookiePair) => {
    return cookiePair[0] === ENTERPRISE_SEARCH_KIBANA_COOKIE;
  });

  if (tokenPackageCookie) {
    return { token_package: tokenPackageCookie[1] };
  } else {
    return {};
  }
}
