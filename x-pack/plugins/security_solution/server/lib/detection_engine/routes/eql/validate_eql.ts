/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from '../../../../../../../../src/core/server';
import { getParsingErrors, isParsingError } from './helpers';

export interface Validation {
  isValid: boolean;
  errors: string[];
}

export interface ValidateEqlParams {
  client: ElasticsearchClient;
  index: string[];
  query: string;
}

export const validateEql = async ({
  client,
  index,
  query,
}: ValidateEqlParams): Promise<Validation> => {
  try {
    await client.eql.search({
      index: index.join(','),
      body: {
        query,
        size: 1,
      },
    });

    return { isValid: true, errors: [] };
  } catch (error) {
    if (isParsingError(error)) {
      return { isValid: false, errors: getParsingErrors(error) };
    }
    throw error;
  }
};
