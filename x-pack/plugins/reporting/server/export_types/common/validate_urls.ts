/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { filter } from 'lodash';

/*
 * isBogusUrl
 *
 * Besides checking to see if the URL is relative, we also
 * need to verify that window.location.href won't navigate
 * to it, which url.parse doesn't catch all variants of
 */
const isBogusUrl = (url: string) => {
  const { host, protocol, port } = parse(url, false, true);

  return host !== null || protocol !== null || port !== null;
};

export const validateUrls = (urls: string[]): void => {
  const badUrls = filter(urls, (url) => isBogusUrl(url));

  if (badUrls.length) {
    throw new Error(`Found invalid URL(s), all URLs must be relative: ${badUrls.join(' ')}`);
  }
};
