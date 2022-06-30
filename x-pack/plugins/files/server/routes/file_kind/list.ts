/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import type { Ensure } from '@kbn/utility-types';
import type { FileJSON } from '../../../common';
import type { ListHttpEndpoint } from '../../../common/api_routes';
import type { FileKindsRequestHandler } from './types';

export const method = 'get' as const;

export const querySchema = schema.object({
  page: schema.maybe(schema.number({ defaultValue: 1 })),
  perPage: schema.maybe(schema.number({ defaultValue: 100 })),
});

type Query = Ensure<ListHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

type Response = ListHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<unknown, Query> = async (
  { files, fileKind },
  req,
  res
) => {
  const {
    query: { page, perPage },
  } = req;
  const { fileService } = await files;
  let results: FileJSON[] = [];
  try {
    const response = await fileService.asCurrentUser().list({ fileKind, page, perPage });
    results = response.map((result) => result.toJSON());
  } catch (e) {
    return res.customError({
      statusCode: 500,
      body: {
        message:
          'Something went wrong while update file attributes. Check server logs for more details.',
      },
    });
  }
  const body: Response = {
    files: results,
  };
  return res.ok({ body });
};
