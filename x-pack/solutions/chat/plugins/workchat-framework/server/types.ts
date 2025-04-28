/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowRunner } from '@kbn/wc-framework-types-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { WorkflowRegistry, ToolRegistry } from './services';

/**
 * Setup contract for the workchatFramework plugin.
 */
export interface WorkChatFrameworkPluginSetup {
  /**
   * APIs to interact with tool registration.
   */
  tools: {
    /**
     * Register a tool to be available globally and usable in any workflow.
     */
    register: ToolRegistry['register'];
  };

  /**
   * APIs to interact with workflow registration.
   */
  workflows: {
    /**
     * Register a 'builtin' workflow to be runnable or usable in other workflows
     */
    register: WorkflowRegistry['register'];
  };
}

/**
 * Start contract for the workchatFramework plugin.
 */
export interface WorkChatFrameworkPluginStart {
  /**
   * APIs to interact with workflow execution
   */
  workflows: {
    /**
     * Execute a workflow and return the result.
     */
    run: WorkflowRunner['run'];
  };
}

export interface WorkChatFrameworkPluginSetupDependencies {
  features: FeaturesPluginSetup;
}

export interface WorkChatFrameworkPluginStartDependencies {
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
}
