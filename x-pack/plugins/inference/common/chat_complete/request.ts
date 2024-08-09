/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '.';
import { ToolOptions } from './tools';

export type ChatCompleteRequestBody = {
  connectorId: string;
  stream?: boolean;
  system?: string;
  messages: Message[];
} & ToolOptions;
