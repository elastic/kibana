/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, item_id } from '../common/schemas';

export const deleteEndpointListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
  })
);

export type DeleteEndpointListItemSchema = t.TypeOf<typeof deleteEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteEndpointListItemSchemaDecoded = DeleteEndpointListItemSchema;
