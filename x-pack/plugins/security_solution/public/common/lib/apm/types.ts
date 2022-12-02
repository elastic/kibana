/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APM_USER_INTERACTIONS } from './constants';

export type ApmUserInteractionName =
  typeof APM_USER_INTERACTIONS[keyof typeof APM_USER_INTERACTIONS];

export type ApmSearchRequestName = `Timeline search ${string}`;

export type ApmTransactionName = ApmSearchRequestName | ApmUserInteractionName;
