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

export interface CrowdStrikeActionsRunScriptParameters {
  Raw?: string;
  HostPath?: string;
  CloudFile?: string;
  CommandLine?: string;
  Timeout?: number;
}

export interface CrowdStrikeActionRunScriptOutputContent {
  output: string;
}

export type CrowdStrikeActionDataParameterTypes = undefined | CrowdStrikeActionsRunScriptParameters;

export type CrowdStrikeActionResponseDataOutput =
  | Record<string, never> // Empty object
  | CrowdStrikeActionRunScriptOutputContent;
