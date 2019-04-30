/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { kfetch } from 'ui/kfetch';
import { capabilities } from 'ui/capabilities';

export class FeaturesService {
  public static async getFeatures() {
    if (capabilities.get().featureControls.manage) {
      return await kfetch({ method: 'get', pathname: '/api/features/v1' });
    }
    return [];
  }
}
