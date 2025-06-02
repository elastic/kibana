/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import {
  type NodeTypeDefinition,
  type LoopNodeConfigType,
  WorkflowExecutionError,
} from '@kbn/wc-framework-types-server';
import { interpolateValue } from '../../state';
import { runNodeSequence } from '../../utils';

export const getLoopNodeTypeDefinition = (): NodeTypeDefinition<LoopNodeConfigType> => {
  return {
    id: NodeType.loop,
    name: 'Loop',
    description: 'Executes a sequence for each element in a list',
    factory: (context) => {
      return {
        run: async ({ input, state, executionState }) => {
          const {
            services: { workflowRunner },
          } = context;

          // no interpolation for nested steps - we let the underlying nodes do it on their own
          const { steps, output } = input;

          let inputList = interpolateValue(input.inputList, state);
          if (typeof inputList === 'string') {
            inputList = state.get(inputList);
          }

          if (!Array.isArray(inputList)) {
            throw new WorkflowExecutionError(
              `Interpolating inputList parameter (${input.inputList}) resulted on a non-array variable`,
              'invalidConfiguration',
              { state: executionState }
            );
          }

          const itemVar = interpolateValue(input.itemVar, state);
          if (typeof itemVar !== 'string') {
            throw new WorkflowExecutionError(
              'itemVar interpolated to a non-string value',
              'invalidParameter',
              { state: executionState }
            );
          }

          // TODO: need to figure out if we clone the state or not
          const loopState = state;
          const resultList: unknown[] = [];
          for (let i = 0; i < inputList.length; i++) {
            const currentItem = inputList[i];
            loopState.set(itemVar, currentItem);

            await runNodeSequence({
              sequence: steps,
              runner: workflowRunner,
              state: loopState,
            });

            if (output) {
              const result = loopState.get(output.source);
              resultList.push(result);
            }
          }

          if (output) {
            state.set(output.destination, resultList);
          }
        },
      };
    },
  };
};
