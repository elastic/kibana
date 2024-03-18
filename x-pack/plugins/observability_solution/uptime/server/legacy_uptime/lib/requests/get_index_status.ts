/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UptimeEsClient } from '../lib';
import { StatesIndexStatus } from '../../../../common/runtime_types';

export const getIndexStatus = async ({
  uptimeEsClient,
  range,
}: {
  uptimeEsClient: UptimeEsClient;
  range?: { to: string; from: string };
}): Promise<StatesIndexStatus> => {
  const { to, from } = range || {};
  try {
    const {
      indices,
      result: {
        body: { count },
      },
    } = await uptimeEsClient.count({
      terminate_after: 1,
      ...(to && from
        ? {
            query: {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: to,
                },
              },
            },
          }
        : {}),
    });
    return {
      indices,
      indexExists: count > 0,
    };
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      // we don't throw an error for index not found
      return {
        indices: '',
        indexExists: false,
      };
    }
    throw e;
  }
};
