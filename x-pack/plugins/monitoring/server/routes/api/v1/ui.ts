/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// these are the remaining routes not yet converted to TypeScript
// all others are registered through index.ts

// @ts-expect-error
export { kibanaInstanceRoute, kibanaInstancesRoute, kibanaOverviewRoute } from './kibana';
