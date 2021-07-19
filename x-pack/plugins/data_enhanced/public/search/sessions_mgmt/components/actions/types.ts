/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type OnActionComplete = () => void;
export type OnActionClick = () => void;
export type OnActionDismiss = () => void;

export enum ACTION {
  INSPECT = 'inspect',
  EXTEND = 'extend',
  DELETE = 'delete',
  RENAME = 'rename',
}
