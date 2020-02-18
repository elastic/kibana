/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraDatabaseSearchResponse } from '../../framework';

export const checkValidNode = async (
  search: <Aggregation>(options: object) => Promise<InfraDatabaseSearchResponse<{}, Aggregation>>,
  indexPattern: string | string[],
  field: string,
  id: string
): Promise<boolean> => {
  const params = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    index: indexPattern,
    terminateAfter: 1,
    body: {
      size: 0,
      query: {
        match: {
          [field]: id,
        },
      },
    },
  };
  const response = await search(params);
  return response.hits.total.value > 0;
};
