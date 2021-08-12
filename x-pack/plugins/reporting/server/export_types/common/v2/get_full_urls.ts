/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as urlParse, UrlWithStringQuery } from 'url';
import { ReportingConfig } from '../../../';
import { getAbsoluteUrlFactory } from '../get_absolute_url';
import { validateUrls } from '../validate_urls';

export function getFullUrls(config: ReportingConfig, relativeUrls: string[]) {
  const [basePath, protocol, hostname, port] = [
    config.kbnConfig.get('server', 'basePath'),
    config.get('kibanaServer', 'protocol'),
    config.get('kibanaServer', 'hostname'),
    config.get('kibanaServer', 'port'),
  ] as string[];
  const getAbsoluteUrl = getAbsoluteUrlFactory({ basePath, protocol, hostname, port });

  validateUrls(relativeUrls);

  const urls = relativeUrls.map((relativeUrl) => {
    const parsedRelative: UrlWithStringQuery = urlParse(relativeUrl);
    return getAbsoluteUrl({
      path: parsedRelative.pathname === null ? undefined : parsedRelative.pathname,
      hash: parsedRelative.hash === null ? undefined : parsedRelative.hash,
      search: parsedRelative.search === null ? undefined : parsedRelative.search,
    });
  });

  return urls;
}
