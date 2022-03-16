/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This interface doesn't cover a full ingest pipeline spec,
// just what's necessary to make it work in the transform creation wizard.
// The full interface can be found in x-pack/plugins/ingest_pipelines/common/types.ts
export interface EsIngestPipeline {
  name: string;
}
