/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import type {
  NodeTypeDefinition,
  ParallelSequencesNodeConfigType,
  SequenceBranch,
} from '@kbn/wc-framework-types-server';

export const getParallelSequencesNodeTypeDefinition =
  (): NodeTypeDefinition<ParallelSequencesNodeConfigType> => {
    return {
      id: NodeType.parallelSequences,
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
