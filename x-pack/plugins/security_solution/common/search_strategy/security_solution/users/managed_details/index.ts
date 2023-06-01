/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/data-common';
import type { EcsBase, EcsEvent, EcsHost, EcsUser, EcsAgent } from '@kbn/ecs';
import type { Inspect, Maybe } from '../../../common';
import type { RequestBasicOptions } from '../..';

export interface ManagedUserDetailsStrategyResponse extends IEsSearchResponse {
  userDetails?: AzureManagedUser;
  inspect?: Maybe<Inspect>;
}

export interface ManagedUserDetailsRequestOptions
  extends Pick<RequestBasicOptions, 'defaultIndex' | 'factoryQueryType'>,
    IEsSearchRequest {
  userName: string;
}

export interface AzureManagedUser extends Pick<EcsBase, '@timestamp'> {
  agent: EcsAgent;
  host: EcsHost;
  event: EcsEvent;
  user: EcsUser & {
    last_name?: string;
    first_name?: string;
    phone?: string[];
  };
}
