/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { list_id } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const exportListItemQuerySchema = t.exact(
  t.type({
    list_id,
    // TODO: Add file_name here with a default value
  })
);

export type ExportListItemQuerySchema = RequiredKeepUndefined<
  t.TypeOf<typeof exportListItemQuerySchema>
>;
export type ExportListItemQuerySchemaEncoded = t.OutputOf<typeof exportListItemQuerySchema>;
