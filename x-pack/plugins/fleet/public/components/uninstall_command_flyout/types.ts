/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const UNINSTALL_COMMAND_TARGETS = ['agent', 'endpoint'] as const;
export type UninstallCommandTarget = (typeof UNINSTALL_COMMAND_TARGETS)[number];

export type PLATFORMS_FOR_UNINSTALL = 'linuxOrMac' | 'windows';

export type Commands = {
  [key in PLATFORMS_FOR_UNINSTALL]: string;
};
