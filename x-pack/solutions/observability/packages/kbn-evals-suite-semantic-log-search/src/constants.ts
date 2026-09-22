/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The tools under evaluation, and the only fixed inputs to a run: everything else varies per
// corpus and lives in a profile under `corpora/`.
export const GET_LOGS_TOOL_ID = 'observability.get_logs';
export const GET_LOGS_SEMANTIC_TOOL_ID = 'observability.get_logs_semantic';
