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
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    children: schema.number({ defaultValue: 10, min: 0, max: 100 }),
    generations: schema.number({ defaultValue: 3, min: 0, max: 3 }),
    ancestors: schema.number({ defaultValue: 3, min: 0, max: 5 }),
    events: schema.number({ defaultValue: 100, min: 0, max: 1000 }),
    alerts: schema.number({ defaultValue: 100, min: 0, max: 1000 }),
    afterEvent: schema.maybe(schema.string()),
    afterAlert: schema.maybe(schema.string()),
    afterChild: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

/**
 * Used to validate GET requests for non process events for a specific event.
 */
export const validateEvents = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    events: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
    afterEvent: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

/**
 * Used to validate GET requests for alerts for a specific process.
 */
export const validateAlerts = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    alerts: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
    afterAlert: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

/**
 * Used to validate GET requests for the ancestors of a process event.
 */
export const validateAncestry = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    ancestors: schema.number({ defaultValue: 0, min: 0, max: 10 }),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

/**
 * Used to validate GET requests for children of a specified process event.
 */
export const validateChildren = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    children: schema.number({ defaultValue: 10, min: 1, max: 100 }),
    generations: schema.number({ defaultValue: 3, min: 1, max: 3 }),
    afterChild: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};
