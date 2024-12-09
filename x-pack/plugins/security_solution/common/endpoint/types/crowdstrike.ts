/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CrowdstrikeActionRequestCommonMeta {
  /** The host name */
  hostName: string;
}

type AtLeastOne<T, K extends keyof T = keyof T> = K extends keyof T
  ? Required<Pick<T, K>> & Partial<Omit<T, K>>
  : never;

export interface CrowdStrikeActionsRunScriptParametersBase {
  Raw?: string;
  HostPath?: string;
  CloudFile?: string;
  CommandLine?: string;
  Timeout?: number;
}

export interface CrowdStrikeActionRunScriptOutputContent {
  output: string;
  code: string;
}

// Enforce at least one of the script parameters is required
export type CrowdStrikeActionsRunScriptParameters = AtLeastOne<
  CrowdStrikeActionsRunScriptParametersBase,
  'Raw' | 'HostPath' | 'CloudFile' | 'CommandLine'
>;

export type CrowdStrikeActionDataParameterTypes = CrowdStrikeActionsRunScriptParameters;

export type CrowdStrikeActionResponseDataOutput =
  | Record<string, never> // Empty object
  | CrowdStrikeActionRunScriptOutputContent;
