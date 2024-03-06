/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/sentinelone/constants';

type ConnectorActionsExecuteOptions = Parameters<ActionsClient['execute']>[0];

interface SentinelOneConnectorExecuteParams<
  P extends Record<string, unknown> = Record<string, unknown>
> {
  subAction: SUB_ACTION;
  subActionParams: P;
}

export type SentinelOneConnectorExecuteOptions<
  P extends Record<string, unknown> = Record<string, any>
> = Omit<ConnectorActionsExecuteOptions, 'params'> & {
  params: SentinelOneConnectorExecuteParams<P> & Record<string, unknown>;
};
