/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MODEL_EVALUATION_RESULTS_INDEX_PATTERN =
  '.kibana-elastic-ai-assistant-evaluation-results';
export const KNOWLEDGE_BASE_INDEX_PATTERN = '.kibana-elastic-ai-assistant-kb';
export const KNOWLEDGE_BASE_INGEST_PIPELINE = '.kibana-elastic-ai-assistant-kb-ingest-pipeline';
// Query for determining if ESQL docs have been loaded, searches for a specific doc. Intended for the ElasticsearchStore.similaritySearch()
// Note: We may want to add a tag of the resource name to the document metadata, so we can CRUD by specific resource
export const ESQL_DOCS_LOADED_QUERY =
  'You can chain processing commands, separated by a pipe character: `|`.';
export const ESQL_RESOURCE = 'esql';
