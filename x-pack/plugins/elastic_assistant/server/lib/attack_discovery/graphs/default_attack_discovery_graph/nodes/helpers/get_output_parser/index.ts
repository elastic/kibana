/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredOutputParser } from 'langchain/output_parsers';

import { AttackDiscoveriesGenerationSchema } from '../../generate/schema';

// NOTE: we ask the LLM for `insight`s. We do NOT use the feature name, `AttackDiscovery`, in the prompt.
export const getOutputParser = () =>
  StructuredOutputParser.fromZodSchema(AttackDiscoveriesGenerationSchema);
