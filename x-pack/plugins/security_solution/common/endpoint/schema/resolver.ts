/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

/**
 * Used to validate GET requests for a complete resolver tree centered around an entity_id.
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

/**
 * Used to validate GET requests for a complete resolver tree.
 */
export const validateTree = {
  body: schema.object({
    // if the ancestry field is specified this field will be ignored
    descendantLevels: schema.number({ defaultValue: 20, min: 0, max: 1000 }),
    descendants: schema.number({ defaultValue: 1000, min: 0, max: 10000 }),
    // if the ancestry array isn't specified allowing 200 might be too high
    ancestors: schema.number({ defaultValue: 200, min: 0, max: 10000 }),
    timerange: schema.object({
      from: schema.string(),
      to: schema.string(),
    }),
    schema: schema.object({
      // the ancestry field is optional
      ancestry: schema.maybe(schema.string({ minLength: 1 })),
      id: schema.string({ minLength: 1 }),
      parent: schema.string({ minLength: 1 }),
    }),
    // only allowing strings and numbers for node IDs because Elasticsearch only allows those types for collapsing:
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/collapse-search-results.html
    // We use collapsing in our Elasticsearch queries for the tree api
    nodes: schema.arrayOf(schema.oneOf([schema.string({ minLength: 1 }), schema.number()]), {
      minSize: 1,
    }),
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
