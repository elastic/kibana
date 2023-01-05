/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Used to validate GET requests for a complete resolver tree.
 */
export const validateTree = {
  body: schema.object({
    /**
     * If the ancestry field is specified this field will be ignored
     *
     * If the ancestry field is specified we have a much more performant way of retrieving levels so let's not limit
     * the number of levels that come back in that scenario. We could still limit it, but what we'd likely have to do
     * is get all the levels back like we normally do with the ancestry array, bucket them together by level, and then
     * remove the levels that exceeded the requested number which seems kind of wasteful.
     */
    descendantLevels: schema.number({ defaultValue: 20, min: 0, max: 1000 }),
    descendants: schema.number({ defaultValue: 1000, min: 0, max: 10000 }),
    // if the ancestry array isn't specified allowing 200 might be too high
    ancestors: schema.number({ defaultValue: 200, min: 0, max: 10000 }),
    timeRange: schema.maybe(
      schema.object({
        from: schema.string(),
        to: schema.string(),
      })
    ),
    schema: schema.object({
      // the ancestry field is optional
      ancestry: schema.maybe(schema.string({ minLength: 1 })),
      id: schema.string({ minLength: 1 }),
      name: schema.maybe(schema.string({ minLength: 1 })),
      parent: schema.string({ minLength: 1 }),
    }),
    // only allowing strings and numbers for node IDs because Elasticsearch only allows those types for collapsing:
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/collapse-search-results.html
    // We use collapsing in our Elasticsearch queries for the tree api
    nodes: schema.arrayOf(schema.oneOf([schema.string({ minLength: 1 }), schema.number()]), {
      minSize: 1,
    }),
    indexPatterns: schema.arrayOf(schema.string(), { minSize: 1 }),
    includeHits: schema.boolean({ defaultValue: false }),
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
  body: schema.object({
    timeRange: schema.maybe(
      schema.object({
        from: schema.string(),
        to: schema.string(),
      })
    ),
    indexPatterns: schema.arrayOf(schema.string()),
    filter: schema.maybe(schema.string()),
    entityType: schema.maybe(schema.string()),
    eventID: schema.maybe(schema.string()),
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
    indices: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
  }),
};
