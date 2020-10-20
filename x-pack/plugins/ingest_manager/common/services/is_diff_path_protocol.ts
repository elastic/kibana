/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// validates an array of urls have the same path and protocol
export function isDiffPathProtocol(kibanaUrls: string[]) {
  const urlCompare = new URL(kibanaUrls[0]);
  const compareProtocol = urlCompare.protocol;
  const comparePathname = urlCompare.pathname;
  return kibanaUrls.some((v) => {
    const url = new URL(v);
    const protocol = url.protocol;
    const pathname = url.pathname;
    return compareProtocol !== protocol || comparePathname !== pathname;
  });
}
