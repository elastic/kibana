/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AgentBuilderSmlPluginSetup } from '@kbn/agent-builder-sml-plugin/server';
import { SML_TEST_GATED_FEATURE_ID, SML_TEST_GATED_KI_TYPE } from '../common/constants';
import { smlTestTypes } from './sml_types';

export interface SetupDependencies {
  agentBuilderSml: AgentBuilderSmlPluginSetup;
  features: FeaturesPluginSetup;
}

export class SmlTestTypesPlugin implements Plugin<void, void, SetupDependencies> {
  setup(core: CoreSetup, { agentBuilderSml, features }: SetupDependencies) {
    for (const definition of smlTestTypes) {
      agentBuilderSml.registerType(definition);
    }

    /**
     * Grants `ai_index:sml_test_gated/read` and nothing else, so a role can be built that differs
     * from a bare SML-read role by exactly the action gating the fixture's gated type.
     */
    features.registerKibanaFeature({
      id: SML_TEST_GATED_FEATURE_ID,
      name: 'SML test — gated type',
      category: DEFAULT_APP_CATEGORIES.kibana,
      app: [],
      catalogue: [],
      privileges: {
        all: {
          app: [],
          api: [],
          catalogue: [],
          aiIndex: { read: [SML_TEST_GATED_KI_TYPE] },
          savedObject: { all: [], read: [] },
          ui: [],
        },
        read: {
          app: [],
          api: [],
          catalogue: [],
          aiIndex: { read: [SML_TEST_GATED_KI_TYPE] },
          savedObject: { all: [], read: [] },
          ui: [],
        },
      },
    });
  }

  start() {}

  stop() {}
}
