/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuiltInNodeTypes } from '@kbn/wc-framework-types-common';
import { type NodeTypeDefinition } from '@kbn/wc-framework-types-server';
import { interpolateValue } from '../../framework/config';

export interface PromptNodeConfigType {
  prompt: string;
  output: string;

  // TODO: structuredOutput
}

export const getPromptNodeTypeDefinition = (): NodeTypeDefinition<PromptNodeConfigType> => {
  return {
    id: BuiltInNodeTypes.prompt,
    name: 'Prompt',
    description: 'Execute a prompt against an LLM and output the result.',
    factory: (context) => {
      return {
        run: async ({ input, state }) => {
          const {
            services: { modelProvider },
          } = context;

          const interpolatedInput = interpolateValue<PromptNodeConfigType>(input, state);
          const { prompt, output } = interpolatedInput;

          const model = modelProvider.getDefaultModel();

          const response = await model.invoke(prompt);

          state.set(output, response.content);
        },
      };
    },
  };
};
