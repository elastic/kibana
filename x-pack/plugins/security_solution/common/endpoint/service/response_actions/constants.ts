/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const RESPONSE_ACTION_STATUS = ['failed', 'pending', 'successful'] as const;
export const RESPONSE_ACTION_COMMANDS = [
  'isolate',
  'unisolate',
  'kill-process',
  'suspend-process',
  'running-processes',
] as const;
