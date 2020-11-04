/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

/**
 * Used to validate GET requests for a complete resolver tree.
 */
export const validateTreeEntityID = {
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

// {
//   id: ["host.id", "process.pid"]
//   parent: ["host.id", "process.parent.pid"]
// }

// {
//   id_definition: [
//     {
//       entity_id_field: "name",
//       parent_id_field: "name_parent",
//     },
//     {
//       entity_id_field: "age",
//       parent_id_field: "age_parent",
//     }
//   ],
//   id: [
//     {
//       "name": "Jon",
//       "age": "50",
//     },
//     {
//       "name": "Mike",
//       "age": "~30",
//     }
//   ],
//   levels: 10,
//   limit: 50,
// }

// toID(): string

/**
 * Used to validate GET requests for a complete resolver tree.
 */
export const validateTree = {
  body: schema.object({
    // if the ancestry field is specified this field will be ignored
    descendantLevels: schema.number({ defaultValue: 20, min: 0, max: 1000 }),
    // levels supersedes limit if it is defined
    descendants: schema.number({ defaultValue: 1000, min: 0, max: 10000 }),
    // if the ancestry array isn't specified we'll want to limit this
    ancestors: schema.number({ defaultValue: 200, min: 0, max: 10000 }),
    timerange: schema.object({
      from: schema.string(),
      to: schema.string(),
    }),
    schema: schema.object({
      // the ancestry field is optional
      ancestry: schema.maybe(schema.string()),
      id: schema.string(),
      parent: schema.string(),
    }),
    // TODO could we be more careful than `any`, it'd probably be nice to support numbers or strings
    nodes: schema.arrayOf(schema.any(), { minSize: 1 }),
    indexPatterns: schema.arrayOf(schema.string(), { minSize: 1 }),
  }),
};

/**
 * Used to validate POST requests for `/resolver/events` api.
 */
export const validateEvents = {
  query: schema.object({
    // keeping the max as 10k because the limit in ES for a single query is also 10k
    limit: schema.number({ defaultValue: 1000, min: 1, max: 10000 }),
    afterEvent: schema.maybe(schema.string()),
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
