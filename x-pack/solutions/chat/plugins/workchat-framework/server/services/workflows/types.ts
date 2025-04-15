/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowRunEventHandler,
  ModelProvider,
  ToolProvider,
} from '@kbn/wc-framework-types-server';
import type { Logger, KibanaRequest, IScopedClusterClient } from '@kbn/core/server';
import type { NodeTypeRegistry } from '../nodes';
import type { WorkflowRegistry } from './registry';

/**
 * Internal context being passed down during workflow execution.
 * Necessary to be able to perform internal / nested step / workflow execution.
 */
export interface WorkflowRunnerInternalContext {
  logger: Logger;
  modelProvider: ModelProvider;
  workflowRegistry: WorkflowRegistry;
  nodeRegistry: NodeTypeRegistry;
  eventHandler?: WorkflowRunEventHandler;
  /**
   * Either the tool provider passed as parameter from the run call, or the default tool provider otherwise.
   */
  toolProvider: ToolProvider;
  esClusterClient: IScopedClusterClient;
  request: KibanaRequest;
}
