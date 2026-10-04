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

// Declared as a literal rather than imported from the plugin, matching the two above: the suite
// measures the response the tool actually sends and should not compile against its internals.
// https://github.com/elastic/kibana/blob/704231072962/x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_log_groups/tool.ts#L38
export const GET_LOG_GROUPS_TOOL_ID = 'observability.get_log_groups';
