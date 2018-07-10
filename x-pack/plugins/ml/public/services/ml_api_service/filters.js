/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for querying filters, which hold lists of entities,
// for example a list of known safe URL domains.

import chrome from 'ui/chrome';

import { http } from 'plugins/ml/services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const filters = {
  filters(obj) {
    const filterId = (obj && obj.filterId) ? `/${obj.filterId}` : '';
    return http({
      url: `${basePath}/filters${filterId}`,
      method: 'GET'
    });
  },

  addFilter(
    filterId,
    description,
    items) {
    return http({
      url: `${basePath}/filters`,
      method: 'PUT',
      data: {
        filterId,
        description,
        items
      }
    });
  },

  updateFilter(
    filterId,
    description,
    addItems,
    deleteItems
  ) {
    return http({
      url: `${basePath}/filters/${filterId}`,
      method: 'PUT',
      data: {
        description,
        addItems,
        deleteItems
      }
    });
  },

  deleteFilter(filterId) {
    return http({
      url: `${basePath}/filters/${filterId}`,
      method: 'DELETE'
    });
  },


};
