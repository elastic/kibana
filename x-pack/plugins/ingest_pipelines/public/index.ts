/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipelinesPlugin } from './plugin';

export function plugin() {
  return new IngestPipelinesPlugin();
}

export {
  INGEST_PIPELINES_APP_ULR_GENERATOR,
  IngestPipelinesUrlGenerator,
  IngestPipelinesUrlGeneratorState,
  INGEST_PIPELINES_PAGES,
} from './url_generator';
