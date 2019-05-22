/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../../../types';

export function featuresRoute(server: Record<string, any>) {
  server.route({
    path: '/api/features/v1',
    method: 'GET',
    options: {
      tags: ['access:features'],
    },
    async handler(request: Record<string, any>) {
      const xpackInfo = server.plugins.xpack_main.info;

      const allFeatures: Feature[] = server.plugins.xpack_main.getFeatures();

      return allFeatures.filter(
        feature =>
          !feature.validLicenses ||
          !feature.validLicenses.length ||
          xpackInfo.license.isOneOf(feature.validLicenses)
      );
    },
  });
}
