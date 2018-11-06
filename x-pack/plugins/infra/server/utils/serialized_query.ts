/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { UserInputError } from 'apollo-server-errors';

import { JsonObject } from '../../common/typed_json';

export const parseFilterQuery = (
  filterQuery: string | null | undefined
): JsonObject | undefined => {
  try {
    if (filterQuery) {
      const parsedFilterQuery = JSON.parse(filterQuery);
      if (
        !parsedFilterQuery ||
        ['string', 'number', 'boolean'].includes(typeof parsedFilterQuery) ||
        Array.isArray(parsedFilterQuery)
      ) {
        throw new Error(
          i18n.translate('xpack.infra.parseFilterQuery.needValueAsObjectErrorTitle', {
            defaultMessage: 'expected value to be an object',
          })
        );
      }
      return parsedFilterQuery;
    } else {
      return undefined;
    }
  } catch (err) {
    throw new UserInputError(
      i18n.translate('xpack.infra.parseFilterQuery.failedToParseQueryErrorTitle', {
        defaultMessage: 'Failed to parse query: {err}',
        values: {
          err,
        },
      }),
      {
        query: filterQuery,
        originalError: err,
      }
    );
  }
};
