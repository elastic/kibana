/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NodeFactoryBaseServices,
  NodeFactoryContext,
  ScopedRunnerRunNodeParams,
  ScopedRunnerRunNodeOutput,
} from '@kbn/wc-framework-types-server';
import type { WorkflowRunnerInternalContext, ScopedNodeRunnerFn } from './types';
import {
  createNoopNodeEventReporter,
  createNodeEventReporter,
  interpolateNodeConfig,
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
  const { nodeRegistry, eventHandler } = internalContext;
  // TODO: check if node type is registered

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
          workflowId: internalContext.workflowId,
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
    scopedRunner,
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
    workflowRunner: scopedRunner,
  };
};
