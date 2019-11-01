/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function hrefIsForAlertDetail(href: string) {
  return alertIdFromHref(href) !== null;
}

export function alertIdFromHref(href: string) {
  const { pathname } = new URL(href);
  // TODO: Verify default type of IDs in elasticsearch
  const uuidRegex = /.*/;

  if (pathname.startsWith('/app/endpoint/alerts/')) {
    const parts = pathname.split('/');
    if (parts.length > 4 && uuidRegex.test(parts[4])) {
      return parts[4];
    }
  }
  return null;
}
