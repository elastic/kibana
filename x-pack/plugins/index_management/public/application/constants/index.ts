/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const REACT_ROOT_ID = 'indexManagementReactRoot';

export const ENRICH_POLICIES_REQUIRED_PRIVILEGES = ['manage_enrich'];

/*  These needs to be imported from `search-inference-endpoints
    However, the plugin is set as private and so adding this temporarily
    and needed to be fixed later.
*/
export const PRECONFIGURED_ENDPOINTS = {
  ELSER: '.elser-2-elasticsearch',
  E5: '.multilingual-e5-small-elasticsearch',
};

export * from './ilm_locator';
