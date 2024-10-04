/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';

export const SO_API_SCRAPER_API_KEY_TYPE = 'api-scraper-api-key';

export const apiScraperApiKeyType: SavedObjectsType = {
  name: SO_API_SCRAPER_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: { type: 'binary' },
    },
  },
  management: {
    importableAndExportable: false,
    displayName: 'Api Scraper API key',
  },
};
