/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraDatabaseSearchResponse } from '../../framework';

export const checkValidNode = async (
  search: <Aggregation>(options: object) => Promise<InfraDatabaseSearchResponse<{}, Aggregation>>,
  indexPattern: string | string[],
  field: string,
  id: string
): Promise<boolean> => {
  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: indexPattern,
    terminate_after: 1,
    body: {
      size: 0,
      query: {
        match: {
          [field]: id,
        },
      },
    },
  };

  const result = await search(params);
  return result && result.hits && result.hits.total && result.hits.total.value > 0;
};
