/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { MakeSinleFieldMathRequest } from '../types';

export const makeSinleFieldMathRequest: MakeSinleFieldMathRequest = ({ events, mappingField }) => {
  const eventsWithField = events.filter((event) =>
    get(event, `_source.${mappingField.eventField}`)
  );

  // TODO make it unique set of events by field?

  const shouldClauses = eventsWithField.map((event) => ({
    match: {
      [mappingField.enrichmentField]: {
        query: get(event._source, mappingField.eventField) as string,
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
