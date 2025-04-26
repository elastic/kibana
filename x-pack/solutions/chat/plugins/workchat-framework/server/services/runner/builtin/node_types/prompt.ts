/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import { NodeTypeDefinition, PromptNodeConfigType } from '@kbn/wc-framework-types-server';
import { interpolateValue } from '../../state';

export const getPromptNodeTypeDefinition = (): NodeTypeDefinition<PromptNodeConfigType> => {
  return {
    id: NodeType.prompt,
    name: 'Prompt',
    description: 'Execute a prompt against an LLM and output the result.',
    factory: (context) => {
      return {
        run: async ({ input, state }) => {
          const {
            services: { modelProvider },
          } = context;

          // TODO: structuredOutput option

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
