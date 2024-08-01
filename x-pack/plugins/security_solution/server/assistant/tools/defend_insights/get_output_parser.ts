/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredOutputParser } from 'langchain/output_parsers';

import { z } from '@kbn/zod';

export const getOutputParser = () =>
  StructuredOutputParser.fromZodSchema(
    z.array(
      z.object({
        endpointIds: z.string().array().describe('The agent IDs that the relevant events are from'),
        eventIds: z.string().array().describe('The event IDs that the insight is based on.'),
        events: z
          .string()
          .array()
          .describe('The process.executable values that the insight is based on'),
        metadata: z.object({}).passthrough().describe('Any additional metadata for the insight'),
      })
    )
  );
