/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { commonSLOSchema } from '../schema';

const createSLOBodySchema = t.intersection([
  commonSLOSchema,
  t.partial({
    settings: t.partial({
      destination_index: t.string,
    }),
  }),
]);

const createSLOParamsSchema = t.type({
  body: createSLOBodySchema,
});

const createSLOResponseSchema = t.type({
  id: t.string,
});

const deleteSLOParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

type CreateSLOParams = t.TypeOf<typeof createSLOBodySchema>;
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>;

export { createSLOParamsSchema, deleteSLOParamsSchema };
export type { CreateSLOParams, CreateSLOResponse };
