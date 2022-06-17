/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { FileKindsRequestHandler } from './types';

export const bodySchema = schema.object({
  name: schema.string(),
  alt: schema.maybe(schema.string()),
  meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  mime: schema.maybe(schema.string()),
});

type Body = TypeOf<typeof bodySchema>;

interface Response {
  id: string;
}

export const handler: FileKindsRequestHandler<unknown, unknown, Body> = async (
  { fileKind, files },
  req,
  res
) => {
  const { fileService } = await files;
  const {
    body: { name, alt, meta },
  } = req;
  const file = await fileService.asCurrentUser().create({ fileKind, name, alt, meta });
  const body: Response = {
    id: file.id,
  };
  return res.ok({ body });
};
