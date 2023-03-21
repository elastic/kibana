/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataProvider, QueryOperator } from '@kbn/timelines-plugin/common';

/**
 * Generate a DataProvider object to use when adding/investigating to/in a timeline.
 * @param field used to generate the DataProvider id as well as its queryMatch
 * @param value used to generate the DataProvider id as well as its name and queryMatch
 */
export const generateDataProvider = (field: string, value: string): DataProvider => {
  const operator = ':' as QueryOperator;
  const id: string = `timeline-indicator-${field}-${value}`;

  return {
    and: [],
    enabled: true,
    id,
    name: value,
    excluded: false,
    kqlQuery: '',
    queryMatch: {
      field,
      value,
      operator,
    },
  };
};
