/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from '../../../../../../../../src/core/server';
import { getValidationErrors, isErrorResponse, isValidationErrorResponse } from './helpers';

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
  const response = await client.eql.search(
    {
      // @ts-expect-error type is missing allow_no_indices
      allow_no_indices: true,
      index: index.join(','),
      body: {
        query,
        size: 1,
      },
    },
    { ignore: [400] }
  );

  if (isValidationErrorResponse(response.body)) {
    return { isValid: false, errors: getValidationErrors(response.body) };
  } else if (isErrorResponse(response.body)) {
    throw new Error(JSON.stringify(response.body));
  } else {
    return { isValid: true, errors: [] };
  }
};
