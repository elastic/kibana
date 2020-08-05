/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

/**
 * On Elastic Cloud, the host URL set in kibana.yml is not necessarily the same
 * URL we want to send users to in the front-end (e.g. if a vanity URL is set).
 *
 * This helper checks a Kibana API endpoint (which has checks an Enterprise
 * Search internal API endpoint) for the correct public-facing URL to use.
 */
export const getPublicUrl = async (http: HttpSetup): Promise<string> => {
  try {
    const { publicUrl } = await http.get('/api/enterprise_search/public_url');
    return stripTrailingSlash(publicUrl);
  } catch {
    return '';
  }
};

const stripTrailingSlash = (url: string): string => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};
