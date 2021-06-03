/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const HostIsolationRequestSchema = {
  body: schema.object({
    /** A list of Fleet Agent IDs whose hosts will be isolated */
    agent_ids: schema.maybe(schema.arrayOf(schema.string())),
    /** A list of endpoint IDs whose hosts will be isolated (Fleet Agent IDs will be retrieved for these) */
    endpoint_ids: schema.maybe(schema.arrayOf(schema.string())),
    /** If defined, any case associated with the given IDs will be updated */
    alert_ids: schema.maybe(schema.arrayOf(schema.string())),
    /** Case IDs to be updated */
    case_ids: schema.maybe(schema.arrayOf(schema.string())),
    comment: schema.maybe(schema.string()),
  }),
};

export const EndpointActionLogRequestSchema = {
  // TODO improve when using pagination with query params
  query: schema.object({}),
  params: schema.object({
    agent_id: schema.string(),
  }),
};
