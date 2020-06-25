/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { list_id } from '../common/schemas';

export const exportListItemQuerySchema = t.exact(
  t.type({
    list_id,
    // TODO: Add file_name here with a default value
  })
);

export type ExportListItemQuerySchema = t.TypeOf<typeof exportListItemQuerySchema>;
export type ExportListItemQuerySchemaEncoded = t.OutputOf<typeof exportListItemQuerySchema>;
