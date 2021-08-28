/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../src/core/public/http/types';
import type { KibanaFeatureConfig } from '../common/kibana_feature';
import { KibanaFeature } from '../common/kibana_feature';

export class FeaturesAPIClient {
  constructor(private readonly http: HttpSetup) {}

  public async getFeatures() {
    const features = await this.http.get<KibanaFeatureConfig[]>('/api/features');
    return features.map((config) => new KibanaFeature(config));
  }
}
