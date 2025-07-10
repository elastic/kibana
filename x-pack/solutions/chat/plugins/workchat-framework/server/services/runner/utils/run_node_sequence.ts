/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NodeSequence,
  WorkflowState,
  ScopedRunner,
  NodeDefinition,
} from '@kbn/wc-framework-types-server';

export interface RunNodeHandlerOpts {
  node: NodeDefinition;
  state: WorkflowState;
  index: number;
}

/**
 * Utility function to run a sequence of nodes.
 */
export const runNodeSequence = async ({
  runner,
  sequence,
  state,
}: {
  runner: ScopedRunner;
  sequence: NodeSequence;
  state: WorkflowState;
  beforeEach?: (opts: RunNodeHandlerOpts) => void;
  afterEach?: (opts: RunNodeHandlerOpts) => void;
}): Promise<void> => {
  for (let i = 0; i < sequence.length; i++) {
    const node = sequence[i];
    await runner.runNode({
      nodeDefinition: node,
      state,
    });
  }
};
