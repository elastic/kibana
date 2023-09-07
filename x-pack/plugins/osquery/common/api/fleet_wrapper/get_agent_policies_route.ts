/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const getAgentPoliciesRequestParamsSchema = t.unknown;

export type GetAgentPoliciesRequestParamsSchema = t.OutputOf<
  typeof getAgentPoliciesRequestParamsSchema
>;

export const getAgentPoliciesRequestQuerySchema = t.unknown;

export type GetAgentPoliciesRequestQuerySchema = t.OutputOf<
  typeof getAgentPoliciesRequestQuerySchema
>;
