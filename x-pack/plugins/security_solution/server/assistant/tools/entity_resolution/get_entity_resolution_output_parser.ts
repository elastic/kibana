/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

export const getEntityResolutionOutputParser = () =>
  StructuredOutputParser.fromZodSchema(
    z
      .array(
        z.object({
          id: z.string().describe('The id of the entity'),
          confidence: z
            .enum(['high', 'medium', 'low'])
            .describe('The confidence level of the match, where high is a strong match'),
          reason: z.string().describe('The reason for the match'),
        })
      )
      .describe(
        `The output of the entity resolution tool. The output is an array of objects, where each object represents a match. Each match object has the following fields: id, confidence, and reason. The id field is the id of the entity, the confidence field is the confidence level of the match, and the reason field is the reason for the match.`
      )
  );
