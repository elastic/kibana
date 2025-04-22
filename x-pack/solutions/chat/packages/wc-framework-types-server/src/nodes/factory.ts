/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { ModelProvider } from '../models/model_provider';
import type { ToolProvider } from '../tools';
import type { ScopedWorkflowProvider, ScopedRunner } from '../workflows';
import type { NodeRunner, DefaultNodeRunnerInput } from './runner';
import type { NodeDefinition } from './definition';
import type { ScopedNodeProvider } from './internal_services';

/**
 * Base set of (pre-scoped) services that will always be exposed to the node factory.
 */
export interface NodeFactoryBaseServices {
  /**
   * Logger scoped to this node.
   *
   * Note: logging from within workflows is mostly for debugging purposes.
   * progression and telemetry events should be used instead for other usages.
   */
  logger: Logger;
  /**
   * Provider exposing LLM models to be used.
   */
  modelProvider: ModelProvider;
  /**
   * Provider exposing tools that are available in that given context (workflow/node)
   */
  toolProvider: ToolProvider;
  /**
   * Scoped cluster client.
   */
  esClusterClient: IScopedClusterClient;
  /**
   * Registry exposing the workflows accessible in the node's context.
   */
  workflowRegistry: ScopedWorkflowProvider;
  /**
   * Registry exposing node types, can be used to access node type definitions.
   */
  nodeRegistry: ScopedNodeProvider;
  /**
   * Scoped node runner, can be used to run nodes as part of a node's execution flow,
   * e.g. for conditional nodes.
   */
  workflowRunner: ScopedRunner;
}

/**
 * Factory services, composed of the base services and additional services that can be
 * injected via {@link NodeDefinition.customServicesProvider}
 */
export type NodeFactoryServices<CustomServices = {}> = CustomServices & NodeFactoryBaseServices;

/**
 * Context that is exposed to a {@NodeRunnerFactory} function.
 */
export interface NodeFactoryContext<CustomServices = {}> {
  /**
   * The (non-interpolated) configuration bound to this node.
   */
  nodeConfiguration: NodeDefinition;
  /**
   * Scoped services that can be used by the factory.
   */
  services: NodeFactoryServices<CustomServices>;

  // TODO: later we probably need accessors for the workflow's config or something.
}

/**
 * Represents a factory that can return a runner for a given node type.
 */
export type NodeRunnerFactory<InputShape = DefaultNodeRunnerInput, CustomServices = {}> = (
  context: NodeFactoryContext<CustomServices>
) => NodeRunner<InputShape>;
