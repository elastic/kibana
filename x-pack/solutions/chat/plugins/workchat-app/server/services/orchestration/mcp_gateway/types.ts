/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { JsonSchemaObject } from '@n8n/json-schema-to-zod';

export type GatewayToolInputSchema = CallToolRequest['params']['arguments'];

export interface GatewayTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
}
