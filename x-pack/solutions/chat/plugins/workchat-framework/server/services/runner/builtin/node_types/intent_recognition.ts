/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NodeType } from '@kbn/wc-framework-types-common';
import { BaseMessageLike } from '@langchain/core/messages';
import {
  WorkflowExecutionError,
  NodeTypeDefinition,
  IntentRecognitionNodeConfigType,
  IntentRecognitionBranch,
  WorkflowState,
  NodeSequence,
} from '@kbn/wc-framework-types-server';
import { interpolateValue } from '../../state';
import { runNodeSequence } from '../../utils';

const defaultIntentionId = 'DEFAULT';

export const getIntentRecognitionNodeTypeDefinition =
  (): NodeTypeDefinition<IntentRecognitionNodeConfigType> => {
    return {
      id: NodeType.intentRecognition,
      name: 'Intent recognition',
      description: 'Classify a message based on a list of intentions',
      factory: (context) => {
        return {
          run: async ({ input, state, executionState }) => {
            const {
              services: { modelProvider, workflowRunner },
            } = context;

            const defaultBranchCount = countDefaultBranches(input.branches);
            if (defaultBranchCount !== 1) {
              throw new WorkflowExecutionError(
                `${NodeType.intentRecognition} nodes must have exactly one default branch, found ${defaultBranchCount}`,
                'invalidConfiguration',
                { state: executionState }
              );
            }

            const branches = convertBranches({ branches: input.branches, state });
            const userPrompt = interpolateValue<string>(input.prompt, state);

            const prompt = getIntentRecognitionPrompt({ branches, userPrompt });

            const model = modelProvider.getDefaultModel().withStructuredOutput(
              z.object({
                intention: z
                  .string()
                  .describe('The ID of the intention that best classifies the user message'),
                reasoning: z
                  .string()
                  .optional()
                  .describe('Optional short reasoning on why this ID was selected'),
              })
            );
            const { intention: selectedIntention } = await model.invoke(prompt);

            const selectedBranch = branches.find((branch) => {
              return branch.id === selectedIntention;
            });
            if (!selectedBranch) {
              throw new WorkflowExecutionError(
                `No branch found for selected intention`,
                'internalError',
                { state: executionState }
              );
            }

            await runNodeSequence({
              sequence: selectedBranch.steps,
              state,
              runner: workflowRunner,
            });
          },
        };
      },
    };
  };

interface IntentionBranch {
  id: string;
  condition: string;
  steps: NodeSequence;
}

const convertBranches = ({
  branches,
  state,
}: {
  branches: IntentRecognitionBranch[];
  state: WorkflowState;
}): IntentionBranch[] => {
  // TODO: sort to have default as last
  return branches.map((branch, index) => {
    if ('default' in branch) {
      return {
        id: defaultIntentionId,
        condition: "The user message doesn't match any of the above",
        steps: branch.steps,
      };
    } else {
      return {
        id: branch.id ?? `INTENTION-${index}`,
        condition: interpolateValue<string>(branch.condition, state),
        steps: branch.steps,
      };
    }
  });
};

const countDefaultBranches = (branches: IntentRecognitionBranch[]): number => {
  return branches.filter((branch) => 'default' in branch).length;
};

const getIntentRecognitionPrompt = ({
  branches,
  userPrompt,
}: {
  branches: IntentionBranch[];
  userPrompt: string;
}): BaseMessageLike[] => {
  const intentionLines = branches.map((branch, i) => {
    return `${i + 1}. ${branch.id} — ${branch.condition}.`;
  });

  return [
    [
      'system',
      `
       ## Instructions

       You are an AI assistant that classifies user messages according to predefined intentions.
       Your task is to read the user's message and select **the single most appropriate intention** from the list below.

       Reply with the ID of the intention (e.g., \`GET_WEATHER\`).
       If the message doesn't clearly match any of the listed intentions, return \`${defaultIntentionId}\`.

       ## Example

       **Available intentions:**

       1. GET_WEATHER — The user wants to know the weather.
       2. SET_REMINDER — The user wants to create a reminder.
       3. TELL_JOKE — The user wants to hear a joke.
       4. ${defaultIntentionId} — The user message doesn't match any of the above.

       **User message:** "What's the weather like in Paris today?"

       **Expected answer:** GET_WEATHER

       ## Input

       Here are the available intentions:

       ${intentionLines.join('\n')}

       The next message in this conversation is the user message to classify.
       `,
    ],
    ['user', userPrompt],
  ];
};
