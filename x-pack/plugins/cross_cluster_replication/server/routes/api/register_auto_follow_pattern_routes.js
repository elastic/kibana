/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from '../../../common/constants';

export const registerAutoFollowPatternRoutes = (server) => {
  /**
   * Returns a list of all Auto Follow patterns
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns`,
    method: 'GET',
    handler: async () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            it: 'works',
          });
        }, 2000);
      });
    },
  });
};
