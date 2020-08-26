/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

/**
 * Used to validate GET requests for a complete resolver tree.
 */
export const validateTree = {
  params: schema.object({ id: schema.string({ minLength: 1 }) }),
  query: schema.object({
    children: schema.number({ defaultValue: 200, min: 0, max: 10000 }),
    ancestors: schema.number({ defaultValue: 200, min: 0, max: 10000 }),
    events: schema.number({ defaultValue: 1000, min: 0, max: 10000 }),
    alerts: schema.number({ defaultValue: 1000, min: 0, max: 10000 }),
    afterEvent: schema.maybe(schema.string()),
    afterAlert: schema.maybe(schema.string()),
    afterChild: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string({ minLength: 1 })),
  }),
};

/**
 * Used to validate GET requests for non process events for a specific event.
 */
export const validateEvents = {
  params: schema.object({ id: schema.string({ minLength: 1 }) }),
  query: schema.object({
    events: schema.number({ defaultValue: 1000, min: 1, max: 10000 }),
    afterEvent: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string({ minLength: 1 })),
  }),
  body: schema.nullable(
    schema.object({
      filter: schema.maybe(schema.string()),
    })
  ),
};

/**
 * Used to validate GET requests for alerts for a specific process.
 */
export const validateAlerts = {
  params: schema.object({ id: schema.string({ minLength: 1 }) }),
  query: schema.object({
    alerts: schema.number({ defaultValue: 1000, min: 1, max: 10000 }),
    afterAlert: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string({ minLength: 1 })),
  }),
  body: schema.nullable(
    schema.object({
      filter: schema.maybe(schema.string()),
    })
  ),
};

/**
 * Used to validate GET requests for the ancestors of a process event.
 */
export const validateAncestry = {
  params: schema.object({ id: schema.string({ minLength: 1 }) }),
  query: schema.object({
    ancestors: schema.number({ defaultValue: 200, min: 0, max: 10000 }),
    legacyEndpointID: schema.maybe(schema.string({ minLength: 1 })),
  }),
};

/**
 * Used to validate GET requests for children of a specified process event.
 */
export const validateChildren = {
  params: schema.object({ id: schema.string({ minLength: 1 }) }),
  query: schema.object({
    children: schema.number({ defaultValue: 200, min: 1, max: 10000 }),
    afterChild: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string({ minLength: 1 })),
  }),
};

/**
 * Used to validate GET requests for 'entities'
 */
export const validateEntities = {
  query: schema.object({
    /**
     * Return the process entities related to the document w/ the matching `_id`.
     */
    _id: schema.string(),
    /**
     * Indices to search in.
     */
    indices: schema.arrayOf(schema.string()),
  }),
};
