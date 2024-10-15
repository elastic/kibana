/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';

import { ExampleInputWithOverrides } from '../../example_input';
import { GraphState } from '../../../graphs/default_attack_discovery_graph/types';

/**
 * Parses input from an LangSmith dataset example to get the graph input overrides
 */
export const getGraphInputOverrides = (outputs: unknown): Partial<GraphState> => {
  const validatedInput = ExampleInputWithOverrides.safeParse(outputs).data ?? {}; // safeParse removes unknown properties

  const { overrides } = validatedInput;

  // return all overrides at the root level:
  return {
    // pick extracts just the anonymizedAlerts and replacements from the root level of the input,
    // and only adds the anonymizedAlerts key if it exists in the input
    ...pick('anonymizedAlerts', validatedInput),
    ...pick('replacements', validatedInput),
    ...overrides, // bring all other overrides to the root level
  };
};
