/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { ActionType, ActionTypeExecutorOptions } from '../../../../actions/server';
import {
  CaseExecutorParamsSchema,
  ExecutorSubActionCreateParamsSchema,
  ExecutorSubActionUpdateParamsSchema,
  CaseConfigurationSchema,
  ExecutorSubActionAddCommentParamsSchema,
  ConnectorSchema,
  CommentSchema,
} from './schema';
import { CaseResponse, CasesResponse } from '../../../common/api';

export type CaseConfiguration = TypeOf<typeof CaseConfigurationSchema>;
export type Connector = TypeOf<typeof ConnectorSchema>;
export type Comment = TypeOf<typeof CommentSchema>;

export type ExecutorSubActionCreateParams = TypeOf<typeof ExecutorSubActionCreateParamsSchema>;
export type ExecutorSubActionUpdateParams = TypeOf<typeof ExecutorSubActionUpdateParamsSchema>;
export type ExecutorSubActionAddCommentParams = TypeOf<
  typeof ExecutorSubActionAddCommentParamsSchema
>;

export type CaseExecutorParams = TypeOf<typeof CaseExecutorParamsSchema>;
export type CaseExecutorResponse = CaseResponse | CasesResponse;

export type CaseActionType = ActionType<
  CaseConfiguration,
  {},
  CaseExecutorParams,
  CaseExecutorResponse | {}
>;

export type CaseActionTypeExecutorOptions = ActionTypeExecutorOptions<
  CaseConfiguration,
  {},
  CaseExecutorParams
>;
