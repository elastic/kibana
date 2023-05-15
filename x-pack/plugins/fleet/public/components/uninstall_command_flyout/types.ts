/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PLATFORM_TYPE } from '../../hooks';

export const UNINSTALL_COMMAND_TARGETS = ['agent', 'endpoint'] as const;
export type UninstallCommandTarget = typeof UNINSTALL_COMMAND_TARGETS[number];

export type Commands = {
  [key in PLATFORM_TYPE]?: string;
};
