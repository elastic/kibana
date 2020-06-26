/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';

export function isInternalURL(url: string, basePath = '') {
  const { protocol, hostname, port, pathname } = parse(
    url,
    false /* parseQueryString */,
    true /* slashesDenoteHost */
  );

  // We should explicitly compare `protocol`, `port` and `hostname` to null to make sure these are not
  // detected in the URL at all. For example `hostname` can be empty string for Node URL parser, but
  // browser (because of various bwc reasons) processes URL differently (e.g. `///abc.com` - for browser
  // hostname is `abc.com`, but for Node hostname is an empty string i.e. everything between schema (`//`)
  // and the first slash that belongs to path.
  if (protocol !== null || hostname !== null || port !== null) {
    return false;
  }

  if (basePath) {
    // Now we need to normalize URL to make sure any relative path segments (`..`) cannot escape expected
    // base path. We can rely on `URL` with a localhost to automatically "normalize" the URL.
    const normalizedPathname = new URL(String(pathname), 'https://localhost').pathname;
    return (
      // Normalized pathname can add a leading slash, but we should also make sure it's included in
      // the original URL too
      pathname?.startsWith('/') &&
      (normalizedPathname === basePath || normalizedPathname.startsWith(`${basePath}/`))
    );
  }

  return true;
}
