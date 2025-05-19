/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, ZodRawShape, ZodTypeAny } from '@kbn/zod';
import { MaybePromise } from '@kbn/utility-types';
import type { ToolDescriptor } from '@kbn/wc-framework-types-common';

/**
 * Represents a tool that will be available to workflows.
 */
export interface Tool<RunInput extends ZodRawShape = ZodRawShape, RunOutput = unknown>
  extends ToolDescriptor {
  /**
   * Tool's input schema, in zod format.
   */
  schema: RunInput;
  /**
   * Handler to call to execute the tool.
   *
   * Note: if the return type is not a string, it will be stringified when passed down to the LLM
   */
  handler: (args: z.objectOutputType<RunInput, ZodTypeAny>) => MaybePromise<RunOutput>;
}
