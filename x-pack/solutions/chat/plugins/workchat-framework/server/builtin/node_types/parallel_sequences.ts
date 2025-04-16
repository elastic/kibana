/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuiltInNodeTypes } from '@kbn/wc-framework-types-common';
import { type NodeTypeDefinition, type NodeDefinition } from '@kbn/wc-framework-types-server';

export interface ParallelSequencesNodeConfigType {
  branches: SequenceBranch[];
}

interface SequenceBranch {
  steps: NodeDefinition[];
}

export const getParallelSequencesNodeTypeDefinition =
  (): NodeTypeDefinition<ParallelSequencesNodeConfigType> => {
    return {
      id: BuiltInNodeTypes.parallelSequences,
      name: 'Parallel sequences',
      description: 'Execute multiple node sequences in parallel',
      factory: (context) => {
        return {
          run: async ({ input, state }) => {
            const {
              services: { workflowRunner },
            } = context;

            // no interpolation - we let the underlying nodes do it on their own
            const { branches } = input;

            const runBranch = async (branch: SequenceBranch) => {
              const { steps } = branch;
              for (let i = 0; i < steps.length; i++) {
                await workflowRunner.runNode({
                  nodeDefinition: steps[i],
                  state,
                });
              }
            };

            await Promise.all(branches.map(runBranch));
          },
        };
      },
    };
  };
