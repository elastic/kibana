/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FINDINGS_PIT_KEEP_ALIVE = '2m';
// Set to half of the PIT keep alive to make sure we keep the PIT window open as long as the components are mounted
export const FINDINGS_REFETCH_INTERVAL_MS = 1000 * 60; // One minute
