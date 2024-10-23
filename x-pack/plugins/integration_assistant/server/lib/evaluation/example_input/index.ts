/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SamplesFormat } from '../../../../common';

/**
 * Parses the input from an example in a LangSmith dataset
 */
export const ExampleInput = z.object({
  rawSamples: z.array(z.string()),
  packageName: z.string(),
  dataStreamName: z.string(),
  samplesFormat: SamplesFormat,
  additionalProcessors: z.array(z.string()).optional(),
});

export type ExampleInput = z.infer<typeof ExampleInput>;

/**
 * The optional overrides for an example input
 */
export const ExampleInputWithOverrides = z.intersection(
  ExampleInput,
  z.object({
    overrides: ExampleInput.optional(),
  })
);

export type ExampleInputWithOverrides = z.infer<typeof ExampleInputWithOverrides>;
