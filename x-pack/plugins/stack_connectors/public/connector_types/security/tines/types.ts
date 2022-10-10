/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  TinesConfig,
  TinesSecrets,
  TinesStoriesActionParams,
  TinesStoriesActionResponse,
  TinesWebhooksActionResponse,
  TinesWebhooksActionParams,
} from '../../../../common/connector_types/security/tines/types';
import type { TinesRunActionParams } from '../../../../common/connector_types/security/tines/types';
import type { SUB_ACTION } from '../../../../common/connector_types/security/tines/constants';

export type SubActionParams = Omit<Partial<TinesRunActionParams>, 'webhook'> & {
  webhook?: Partial<TinesRunActionParams['webhook']>;
};

export interface TinesActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: SubActionParams;
}
