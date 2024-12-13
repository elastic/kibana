/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExampleInput } from '../../example_input';

/**
 * Parses input from an LangSmith dataset example to get the graph input overrides
 */
export const getGraphInputOverrides = (outputs: unknown): Partial<ExampleInput> => {
  const validatedInput = ExampleInput.safeParse(outputs).data ?? {}; // safeParse removes unknown properties

  // return all overrides at the root level:
  return {
    // pick extracts just the anonymizedAlerts and replacements from the root level of the input,
    // and only adds the anonymizedAlerts key if it exists in the input
    ...validatedInput, // bring all other overrides to the root level
  };
};
