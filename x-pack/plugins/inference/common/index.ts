/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  correctCommonEsqlMistakes,
  splitIntoCommands,
} from './tasks/nl_to_esql/correct_common_esql_mistakes';

export { generateFakeToolCallId } from './utils/generate_fake_tool_call_id';

export { createOutputApi } from './create_output_api';

export type { ChatCompleteRequestBody, GetConnectorsResponseBody } from './http_apis';
