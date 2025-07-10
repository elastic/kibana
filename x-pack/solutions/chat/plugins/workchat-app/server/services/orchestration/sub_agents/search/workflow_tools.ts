/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DynamicStructuredTool } from '@langchain/core/tools';

export const stepDoneToolName = 'STEP_DONE';

export const stepDoneTool = () => {
  return new DynamicStructuredTool({
    name: stepDoneToolName,
    description: 'use this tool to notify that you want to transition to the next step',
    schema: z.object({}),
    func: () => {
      throw new Error(`${stepDoneToolName} was called and shouldn't have`);
    },
  });
};
