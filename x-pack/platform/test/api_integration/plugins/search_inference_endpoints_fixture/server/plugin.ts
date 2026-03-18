/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';

interface FixtureStartDeps {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}

export class FixturePlugin implements Plugin<void, void, {}, FixtureStartDeps> {
  constructor(context: PluginInitializerContext<{}>) {}

  public setup() {}

  public start(_core: unknown, { searchInferenceEndpoints }: FixtureStartDeps) {
    searchInferenceEndpoints.features.register({
      featureId: 'test_feature_root',
      featureName: 'Test Feature Root',
      featureDescription: 'A root test feature for FTR integration tests.',
      taskType: 'chat_completion',
      recommendedEndpoints: ['test-endpoint-1', 'test-endpoint-2'],
    });

    searchInferenceEndpoints.features.register({
      featureId: 'test_feature_child',
      parentFeatureId: 'test_feature_root',
      featureName: 'Test Feature Child',
      featureDescription: 'A child test feature for FTR integration tests.',
      taskType: 'chat_completion',
      maxNumberOfEndpoints: 2,
      recommendedEndpoints: ['test-endpoint-1'],
    });
  }

  public stop() {}
}
