/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentBuilderSmlPluginSetup } from '@kbn/agent-builder-sml-plugin/server';
import { SML_TEST_GATED_FEATURE_ID, SML_TEST_GATED_KI_TYPE } from '../common/constants';
import { smlTestTypes } from './sml_types';

export interface SetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentBuilderSml: AgentBuilderSmlPluginSetup;
  features: FeaturesPluginSetup;
}

export class SmlTestTypesPlugin implements Plugin<void, void, SetupDependencies> {
  setup(core: CoreSetup, { agentBuilder, agentBuilderSml, features }: SetupDependencies) {
    for (const definition of smlTestTypes) {
      agentBuilderSml.registerType(definition);
    }

    /**
     * `ai.conversation.updated` is opt-in and no solution plugin enables it on the Agent Builder
     * Scout deployment, so `conversation_updated_trigger_api.spec.ts` would never see the trigger
     * fire without this. Both templates are needed: the spec asserts that escalation writes are
     * emitted too, just not matched by its workflow.
     */
    agentBuilder.conversations.enableUpdatedTrigger({
      templateIds: ['investigation', 'escalation'],
      isEnabled: async () => true,
    });

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
