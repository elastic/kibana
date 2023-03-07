/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { decodeSchema } from './schema_utils';

/**
 * This schema must match the CloseAlertParamsSchema in x-pack/plugins/stack_connectors/server/connector_types/stack/opsgenie/schema.ts
 * except that it makes all fields partial.
 */
const CloseAlertSchema = rt.exact(
  rt.partial({
    alias: rt.string,
    user: rt.string,
    source: rt.string,
    note: rt.string,
  })
);

type CloseAlertSchemaType = rt.TypeOf<typeof CloseAlertSchema>;

export const isPartialCloseAlertSchema = (data: unknown): data is CloseAlertSchemaType => {
  try {
    decodeSchema(CloseAlertSchema, data);
    return true;
  } catch (error) {
    return false;
  }
};
