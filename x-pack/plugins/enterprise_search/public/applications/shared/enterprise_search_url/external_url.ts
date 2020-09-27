/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * NOTE: The externalUrl obj holds the reference to externalUrl, which should
 * only ever be updated once on plugin init. We're using a getter and setter
 * here to ensure it isn't accidentally mutated.
 *
 * Someday (8.x+), when our UI is entirely on Kibana and no longer on
 * Enterprise Search's standalone UI, we can potentially deprecate this helper.
 */
export const externalUrl = {
  _enterpriseSearchUrl: '',
  get enterpriseSearchUrl() {
    return this._enterpriseSearchUrl;
  },
  set enterpriseSearchUrl(value) {
    if (this._enterpriseSearchUrl) {
      // enterpriseSearchUrl is set once on plugin init - we should not mutate it
      return;
    }
    this._enterpriseSearchUrl = value;
  },
};

export const getEnterpriseSearchUrl = (path: string = ''): string => {
  return externalUrl.enterpriseSearchUrl + path;
};
export const getAppSearchUrl = (path: string = ''): string => {
  return getEnterpriseSearchUrl('/as' + path);
};
export const getWorkplaceSearchUrl = (path: string = ''): string => {
  return getEnterpriseSearchUrl('/ws' + path);
};
