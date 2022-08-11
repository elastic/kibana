/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const DownloadSourceBaseSchema = {
  id: schema.maybe(schema.string()),
  name: schema.string(),
  host: schema.uri({ scheme: ['http', 'https'] }),
  is_default: schema.boolean({ defaultValue: false }),
};

export const DownloadSourceSchema = schema.object({ ...DownloadSourceBaseSchema });
