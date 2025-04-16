/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WorkflowExecutionError,
  type NodeFactoryBaseServices,
  type NodeFactoryContext,
  type ScopedRunnerRunNodeParams,
  type ScopedRunnerRunNodeOutput,
} from '@kbn/wc-framework-types-server';
import type { WorkflowRunnerInternalContext, ScopedNodeRunnerFn } from './types';
import {
  createNoopNodeEventReporter,
  createNodeEventReporter,
  interpolateNodeConfig,
  enterNode,
} from './utils';

/**
 * Returns a step runner already scoped to the given context.
 */
export const createNodeRunner = (params: {
  internalContext: WorkflowRunnerInternalContext;
}): ScopedNodeRunnerFn => {
  return (args) => {
    return runNode({
      ...params,
      ...args,
    });
  };
};

type RunStepParams = ScopedRunnerRunNodeParams & {
  internalContext: WorkflowRunnerInternalContext;
};

const runNode = async ({
  nodeDefinition,
  state,
  internalContext,
}: RunStepParams): Promise<ScopedRunnerRunNodeOutput> => {
  // update the execution state - context is already a copy, it's safe to reference
  internalContext.executionState = enterNode({
    parent: internalContext.executionState,
    nodeId: nodeDefinition.id,
  });
  const { nodeRegistry, eventHandler } = internalContext;

  if (!nodeRegistry.has(nodeDefinition.type)) {
    throw new WorkflowExecutionError(
      `Node type [${nodeDefinition.type}] not found in registry`,
      'nodeTypeNotFound',
      { state: internalContext.executionState }
    );
  }

  const nodeType = nodeRegistry.get(nodeDefinition.type);

  const nodeServices = createBaseNodeServices({ internalContext });
  // TODO: check / call nodeType.customServicesProvider if present

  const context: NodeFactoryContext = {
    nodeConfiguration: nodeDefinition,
    services: nodeServices,
  };

  const nodeRunner = nodeType.factory(context);

  // interpolating the node config with the state
  const nodeInput = interpolateNodeConfig({
    config: nodeDefinition.typeConfig,
    state,
  });

  // creating the event reporter
  const eventReporter = eventHandler
    ? createNodeEventReporter({
        onEvent: eventHandler,
        meta: {
          workflowId: internalContext.executionState.workflowId,
          nodeId: nodeDefinition.id,
          nodeType: nodeDefinition.type,
        },
      })
    : createNoopNodeEventReporter();

  // executing the node
  const output = await nodeRunner.run({
    input: nodeInput,
    state,
    eventReporter,
  });

  // writing output to state
  const stateOutputField = nodeDefinition.output;
  state.set(stateOutputField, output);

  // end of node execution
  return output;
};

const createBaseNodeServices = ({
  internalContext: {
    logger,
    modelProvider,
    toolProvider,
    esClusterClient,
    nodeRegistry,
    workflowRegistry,
    getRunner,
  },
}: {
  internalContext: WorkflowRunnerInternalContext;
}): NodeFactoryBaseServices => {
  return {
    logger: logger.get('workflow-runner'),
    modelProvider,
    toolProvider,
    esClusterClient,
    nodeRegistry,
    workflowRegistry,
    workflowRunner: getRunner(),
  };
};
