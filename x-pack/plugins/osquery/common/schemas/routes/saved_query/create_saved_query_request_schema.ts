/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  id,
  descriptionOrUndefined,
  Description,
  platformOrUndefined,
  query,
  versionOrUndefined,
  interval,
  ecsMappingOrUndefined,
} from '../../common/schemas';
import { RequiredKeepUndefined } from '../../../types';

export const createSavedQueryRequestSchema = t.type({
  id,
  description: descriptionOrUndefined,
  platform: platformOrUndefined,
  query,
  version: versionOrUndefined,
  interval,
  ecs_mapping: ecsMappingOrUndefined,
});

export type CreateSavedQueryRequestSchema = t.OutputOf<typeof createSavedQueryRequestSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateSavedQueryRequestSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createSavedQueryRequestSchema>>,
  'description'
> & {
  description: Description;
};
