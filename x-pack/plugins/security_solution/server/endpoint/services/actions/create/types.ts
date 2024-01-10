/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import type { ResponseActionBodySchema } from '../../../../../common/api/endpoint';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
} from '../../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';

export type CreateActionPayload = TypeOf<typeof ResponseActionBodySchema> & {
  command: ResponseActionsApiCommandNames;
  user?: { username: string } | null | undefined;
  rule_id?: string;
  rule_name?: string;
  error?: string;
  hosts?: Record<string, { name: string }>;
};

export interface CreateActionMetadata {
  minimumLicenseRequired?: LicenseType;
}

export interface ActionCreateService {
  createActionFromAlert: (payload: CreateActionPayload, agents: string[]) => Promise<ActionDetails>;
  createAction: <
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
  >(
    payload: CreateActionPayload,
    agents: string[],
    metadata?: CreateActionMetadata
  ) => Promise<ActionDetails<TOutputContent, TParameters>>;
}
