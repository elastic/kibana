/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// the field that the enrich processor writes to
export const ENRICH_FIELD = 'historical';

// only to be used in development, adds debug steps to the ingest pipeline
export const DEBUG_MODE = true; // TODO: once we are happy everything is working we will change this back
