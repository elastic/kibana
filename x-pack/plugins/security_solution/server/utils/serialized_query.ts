/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UserInputError } from 'apollo-server-errors';
import { isEmpty, isPlainObject, isString } from 'lodash/fp';

import { JsonObject } from '../../../../../src/plugins/kibana_utils/common';

export const parseFilterQuery = (filterQuery: string): JsonObject => {
  try {
    if (filterQuery && isString(filterQuery) && !isEmpty(filterQuery)) {
      const parsedFilterQuery = JSON.parse(filterQuery);
      if (
        !parsedFilterQuery ||
        !isPlainObject(parsedFilterQuery) ||
        Array.isArray(parsedFilterQuery)
      ) {
        throw new Error('expected value to be an object');
      }
      return parsedFilterQuery;
    }
    return {};
  } catch (err) {
    throw new UserInputError(`Failed to parse query: ${err}`, {
      query: filterQuery,
      originalError: err,
    });
  }
};
