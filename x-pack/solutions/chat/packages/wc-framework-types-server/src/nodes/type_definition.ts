/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { NodeRunnerFactory } from './factory';
import type { DefaultNodeRunnerInput } from './runner';

/**
 * Represents the definition for a given node type.
 *
 * Similar to SOs, vis types and so on, this defines all the properties
 * and handlers that are going to be used to manage the lifecycle of a node type.
 */
export interface NodeTypeDefinition<NodeInput = DefaultNodeRunnerInput, CustomServices = {}> {
  /**
   * The unique identifier for this node type (it's type)
   */
  id: string;
  /**
   * Human-readable name for this node type
   */
  name: string;
  /**
   * Short human-readable description for this node type.
   */
  description: string;
  /**
   * The {@link NodeRunnerFactory} for this node type.
   */
  factory: NodeRunnerFactory<NodeInput, CustomServices>;
  /**
   * Allows defining a handler to return arbitrary services that will be exposed to
   * the {@link NodeRunnerFactory} via it's context, {@link NodeFactoryContext}.
   *
   * This can be used as a convenient way to pass down additional services to
   * the node factory and runner, for situations where the node type might need
   * to access those services during its execution.
   */
  customServicesProvider?: CustomServicesProvider<CustomServices>;
}

export type CustomServicesProvider<T> = () => MaybePromise<T>;
