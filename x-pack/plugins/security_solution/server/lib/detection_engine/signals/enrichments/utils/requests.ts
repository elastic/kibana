/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSinleFieldMathRequest } from '../types';
import { getEventValue } from './events';

export const makeSinleFieldMathRequest: MakeSinleFieldMathRequest = ({ events, mappingField }) => {
  const shouldClauses = events.map((event) => ({
    match: {
      [mappingField.enrichmentField]: {
        query: getEventValue(event, mappingField.eventField),
        minimum_should_match: 1,
      },
    },
  }));

  return {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
    },
    query: {
      bool: {
        should: shouldClauses,
        minimum_should_match: 1,
      },
    },
  };
};
