/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, item_id } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const readEndpointListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
  })
);

export type ReadEndpointListItemSchemaPartial = t.TypeOf<typeof readEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ReadEndpointListItemSchemaPartialDecoded = ReadEndpointListItemSchemaPartial;

// This type is used after a decode since some things are defaults after a decode.
export type ReadEndpointListItemSchemaDecoded = RequiredKeepUndefined<
  ReadEndpointListItemSchemaPartialDecoded
>;

export type ReadEndpointListItemSchema = RequiredKeepUndefined<ReadEndpointListItemSchemaPartial>;
