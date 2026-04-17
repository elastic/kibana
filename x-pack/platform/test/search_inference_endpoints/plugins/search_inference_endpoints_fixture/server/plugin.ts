/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';

interface SetupDeps {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup;
}

export class SearchInferenceEndpointsFixturePlugin implements Plugin {
  constructor(context: PluginInitializerContext) {}

  setup(core: CoreSetup, { searchInferenceEndpoints }: SetupDeps) {
    const { register } = searchInferenceEndpoints.features;

    register({
      featureId: 'test_inference_parent',
      featureName: 'Test Inference',
      featureDescription: 'Test parent feature for Scout integration tests',
      taskType: 'chat_completion',
      recommendedEndpoints: [
        '.anthropic-claude-3.7-sonnet-chat_completion',
        '.openai-gpt-4.1-chat_completion',
      ],
    });

    register({
      featureId: 'test_feature_alpha',
      parentFeatureId: 'test_inference_parent',
      featureName: 'Test Feature Alpha',
      featureDescription: 'First test child feature for verifying Add Model and Copy To flows',
      taskType: 'chat_completion',
      recommendedEndpoints: ['.anthropic-claude-3.7-sonnet-chat_completion'],
    });

    register({
      featureId: 'test_feature_beta',
      parentFeatureId: 'test_inference_parent',
      featureName: 'Test Feature Beta',
      featureDescription: 'Second test child feature for verifying Copy To target behavior',
      taskType: 'chat_completion',
      recommendedEndpoints: ['.openai-gpt-4.1-chat_completion'],
    });
  }

  start() {}
}
