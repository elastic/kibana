/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Query for determining if ESQL docs have been loaded, searches for a specific doc. Intended for the ElasticsearchStore.similaritySearch()
// Note: We may want to add a tag of the resource name to the document metadata, so we can CRUD by specific resource
export const ESQL_DOCS_LOADED_QUERY =
  'You can chain processing commands, separated by a pipe character: `|`.';
export const SECURITY_LABS_RESOURCE = 'security_labs';
export const USER_RESOURCE = 'user';
// Query for determining if Security Labs docs have been loaded. Intended for use with Telemetry
export const SECURITY_LABS_LOADED_QUERY = 'What is Elastic Security Labs';
